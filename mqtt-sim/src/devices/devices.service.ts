// src/devices/devices.service.ts
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { Device } from './device.entity';
import { DeviceState } from './device-state.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { topics } from '../mqtt/topics';
import { ConfigService } from '@nestjs/config';
import { getKind } from './kinds/registry';
import { toSlug } from './slug.util';
import { QueryFailedError } from 'typeorm';
import { buildDiscoveryPayload } from './discovery';
import { ImportPayloadDto, ExportedDevice } from './dto/import.dto';
import { DevicesGateway } from './devices.gateway';

@Injectable()
export class DevicesService implements OnModuleInit {
    private ns: string;
    private timers = new Map<string, NodeJS.Timeout>(); // deviceId -> interval
    private discoveryEnabled: boolean;

    constructor(
        @InjectRepository(Device) private devices: Repository<Device>,
        @InjectRepository(DeviceState) private states: Repository<DeviceState>,
        private mqtt: MqttService,
        private gateway: DevicesGateway,
        cfg: ConfigService,
    ) {
        this.ns = cfg.get('MQTT_NAMESPACE', 'sim');
        this.discoveryEnabled = (cfg.get('DISCOVERY_ENABLED', 'true') as string) !== 'false';
    }

    async onModuleInit() {
        // 1) Wildcard-Subscribe + Router registrieren
        this.mqtt.subscribeCommandsWildcard();
        this.mqtt.onCommand(({ type, id, payload }) => this.applyCommand(id, type, payload));

        // 2) Telemetrie-Timer wiederherstellen
        const withTelemetry = await this.devices.find({
            where: { telemetryIntervalSec: Raw((a) => `${a} > 0`) },
        });
        for (const d of withTelemetry) this.ensureTelemetryTimer(d);

        // Discovery nicht republishen (retained).
    }

    async list(type?: string, slug?: string, page: number = 1, limit: number = 50) {
        const where: any = {};
        if (type) where.type = type;
        if (slug) where.slug = slug;

        // Ensure valid pagination values
        page = Math.max(1, Number(page) || 1);
        limit = Math.max(1, Math.min(500, Number(limit) || 50)); // Max 500 per page

        const skip = (page - 1) * limit;

        const [devices, total] = await this.devices.findAndCount({
            where,
            relations: { state: true },
            skip,
            take: limit,
        });

        return {
            data: devices,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // ---------- Telemetrie ----------

    private async heartbeatTick(device: Device) {
        const st = await this.states.findOne({ where: { deviceId: device.id } });
        if (!st) return;

        const kind = getKind(device.type);
        const caps = device.capabilities || {};
        let data = st.data;
        if (typeof kind.tick === 'function') {
            try {
                data = kind.tick(st.data, caps);
                if (data !== st.data) {
                    await this.states.update({ deviceId: device.id }, { data });
                }
            } catch {
                // tick-Fehler ignorieren
            }
        }
        this.mqtt.publish(topics.state(this.ns, device.type, device.id), data, { retain: true });

        // Emit WebSocket event for telemetry updates
        this.gateway.emitDeviceStateChanged(device.id, device.type, data);
    }

    private ensureTelemetryTimer(device: Device) {
        this.clearTelemetryTimer(device.id);
        if (!device.telemetryIntervalSec || device.telemetryIntervalSec <= 0) return;
        const handle = setInterval(() => this.heartbeatTick(device), device.telemetryIntervalSec * 1000);
        this.timers.set(device.id, handle);
    }

    private clearTelemetryTimer(deviceId: string) {
        const h = this.timers.get(deviceId);
        if (h) clearInterval(h);
        this.timers.delete(deviceId);
    }

    // ---------- Discovery ----------

    private publishDiscoveryIfEnabled(d: Device) {
        if (!this.discoveryEnabled) return;
        const payload = buildDiscoveryPayload(this.ns, d);
        const t = topics.discovery(this.ns, d.type, d.id);
        this.mqtt.publish(t, payload, { retain: true });
    }

    private clearDiscovery(d: Device) {
        const t = topics.discovery(this.ns, d.type, d.id);
        this.mqtt.publish(t, '', { retain: true });
    }

    // ---------- Create / Command / Update / Delete ----------

    async createDevice(
        type: string,
        name: string,
        slug?: string,
        caps?: Record<string, any>,
        templateId?: string,
    ) {
        let kind;
        try {
            kind = getKind(type);
        } catch {
            throw new BadRequestException(`Unsupported device type: ${type}`);
        }

        if (slug) {
            const existing = await this.devices.findOne({ where: { type, slug }, relations: { state: true } });
            if (existing) return { id: existing.id, slug, existed: true };
        }

        // slug auto
        let finalSlug = slug;
        if (!finalSlug) {
            const base = toSlug(name);
            finalSlug = base;
            let i = 2;
            while (await this.devices.findOne({ where: { type, slug: finalSlug } })) {
                finalSlug = `${base}-${i++}`;
            }
        }

        const mergedCaps = { ...kind.capabilities(), ...(caps || {}) };

        // Use device-kind-specific default telemetry interval
        const defaultTelemetryInterval = kind.defaultTelemetryInterval?.() ?? 0;

        let attempt = 0;
        while (true) {
            try {
                const device = await this.devices.save(
                    this.devices.create({
                        type,
                        name,
                        slug: finalSlug,
                        capabilities: mergedCaps,
                        templateId,
                        topicBase: `${this.ns}/${type}`,
                        retained: true,
                        telemetryIntervalSec: defaultTelemetryInterval,
                    }),
                );

                const init = kind.defaultState(mergedCaps);
                await this.states.save(this.states.create({ deviceId: device.id, data: init }));

                // birth -> status -> state
                this.mqtt.publish(`${this.ns}/service/birth`, { deviceId: device.id, type }, { retain: false });
                this.mqtt.publish(topics.status(this.ns, type, device.id), 'online', { retain: true });
                this.mqtt.publish(topics.state(this.ns, type, device.id), init, { retain: true });

                // discovery
                this.publishDiscoveryIfEnabled(device);

                // Activate telemetry timer if default interval is enabled
                if (defaultTelemetryInterval > 0) {
                    this.ensureTelemetryTimer(device);
                }

                // KEIN per-Device-Subscribe mehr nötig (Wildcard übernimmt)

                // Emit WebSocket event for real-time updates
                const deviceWithState = { ...device, state: init };
                this.gateway.emitDeviceCreated(deviceWithState);

                return {
                    id: device.id,
                    slug: finalSlug,
                    type,
                    templateId: device.templateId,
                    capabilities: device.capabilities,
                    topics: {
                        cmd: topics.cmd(this.ns, type, device.id),
                        state: topics.state(this.ns, type, device.id),
                        status: topics.status(this.ns, type, device.id),
                        discovery: topics.discovery(this.ns, type, device.id),
                    },
                    state: init,
                    existed: false,
                };
            } catch (e) {
                const isUnique = e instanceof QueryFailedError && String((e as any).code) === 'SQLITE_CONSTRAINT';
                if (isUnique && !slug) {
                    if (++attempt > 5) throw new ConflictException(`Could not allocate unique slug for base '${finalSlug}'`);
                    finalSlug = `${toSlug(name)}-${attempt + 1}`;
                    continue;
                }
                throw e;
            }
        }
    }

    /**
     * Coerce numeric string values in command to proper number types
     * Handles cases where sliders send values as strings instead of numbers
     */
    private coerceCommandValues(cmd: any): any {
        if (!cmd || typeof cmd !== 'object') return cmd;

        const coerced = { ...cmd };
        const numericFields = [
            'brightness', 'colorTemperature', 'position', 'speed',
            'temperature', 'humidity', 'pressure', 'value'
        ];

        for (const field of numericFields) {
            if (field in coerced && typeof coerced[field] === 'string') {
                const num = parseFloat(coerced[field]);
                if (!isNaN(num)) {
                    coerced[field] = num;
                }
            }
        }

        return coerced;
    }

    async applyCommand(deviceId: string, type: string, raw: Buffer | object) {
        const kind = getKind(type);
        const prev = await this.states.findOneBy({ deviceId });
        const dev = await this.devices.findOneBy({ id: deviceId });
        if (!prev || !dev) return;

        const caps = dev.capabilities || {};
        let cmd = typeof raw === 'object' ? raw : JSON.parse(raw);

        // Coerce string values to numbers for known numeric fields
        cmd = this.coerceCommandValues(cmd);

        try {
            kind.validate?.(cmd, caps);
        } catch (e: any) {
            throw new BadRequestException(e.message);
        }

        const next = kind.reduce(prev.data, cmd, caps);
        await this.states.update({ deviceId }, { data: next });
        this.mqtt.publish(topics.state(this.ns, type, deviceId), next, { retain: true });

        // Emit WebSocket event for real-time state updates
        this.gateway.emitDeviceStateChanged(deviceId, type, next);
    }

    async sendById(id: string, cmd: any) {
        const dev = await this.devices.findOneBy({ id });
        if (!dev) throw new NotFoundException(`Device not found: ${id}`);
        return this.applyCommand(id, dev.type, cmd);
    }

    async updateTelemetry(id: string, intervalSec: number) {
        if (intervalSec < 0) throw new BadRequestException('intervalSec must be >= 0');
        const dev = await this.devices.findOneBy({ id });
        if (!dev) throw new NotFoundException(`Device not found: ${id}`);

        dev.telemetryIntervalSec = intervalSec;
        await this.devices.save(dev);
        this.ensureTelemetryTimer(dev);
        return { id, telemetryIntervalSec: intervalSec };
    }

    async updateDevice(
        id: string,
        body: { name?: string; capabilities?: Record<string, any>; templateId?: string },
    ) {
        const dev = await this.devices.findOneBy({ id });
        if (!dev) throw new NotFoundException(`Device not found: ${id}`);

        if (typeof body.name === 'string' && body.name.trim()) dev.name = body.name.trim();
        if (body.capabilities && typeof body.capabilities === 'object') {
            dev.capabilities = { ...dev.capabilities, ...body.capabilities };
        }
        if (typeof body.templateId === 'string') dev.templateId = body.templateId;

        await this.devices.save(dev);
        this.publishDiscoveryIfEnabled(dev);

        // Emit WebSocket event for device updates
        this.gateway.emitDeviceUpdated(dev);

        return { id: dev.id, updated: true };
    }

    async refreshDiscovery(id: string) {
        const dev = await this.devices.findOneBy({ id });
        if (!dev) throw new NotFoundException(`Device not found: ${id}`);
        this.publishDiscoveryIfEnabled(dev);
        return { id, discoveryRepublished: true };
    }

    async remove(id: string) {
        const dev = await this.devices.findOneBy({ id });
        if (!dev) throw new NotFoundException(`Device not found: ${id}`);

        this.clearTelemetryTimer(id);

        // retained Topics leeren
        this.mqtt.publish(topics.state(this.ns, dev.type, id), '', { retain: true });
        this.mqtt.publish(topics.status(this.ns, dev.type, id), '', { retain: true });

        // Discovery löschen
        this.clearDiscovery(dev);

        await this.devices.delete({ id });

        // Emit WebSocket event for device deletion
        this.gateway.emitDeviceDeleted(id, dev.type);

        return { id, removed: true };
    }

    // ---------- Export / Import ----------

    async exportAll() {
        const all = await this.devices.find({ relations: { state: true } });
        const devices = all.map(d => ({
            id: d.id,
            type: d.type,
            name: d.name,
            slug: d.slug ?? undefined,
            templateId: d.templateId ?? undefined,
            capabilities: d.capabilities ?? {},
            telemetryIntervalSec: d.telemetryIntervalSec ?? 0,
            state: d.state?.data ?? {},
            createdAt: d.createdAt?.toISOString?.() ?? undefined,
            updatedAt: d.updatedAt?.toISOString?.() ?? undefined,
            topics: {
                cmd: topics.cmd(this.ns, d.type, d.id),
                state: topics.state(this.ns, d.type, d.id),
                status: topics.status(this.ns, d.type, d.id),
                discovery: topics.discovery(this.ns, d.type, d.id),
            },
        }));
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            namespace: this.ns,
            count: devices.length,
            devices,
        };
    }

    async importAll(payload: ImportPayloadDto) {
        if (!payload || !Array.isArray(payload.devices)) {
            throw new BadRequestException('devices array required');
        }
        const report = { created: 0, updated: 0, unchanged: 0, deleted: 0, errors: 0, details: [] as any[] };

        // Optional replaceAll: Schlüssel sammeln (type#slug)
        const incomingKeys = new Set<string>();
        for (const dev of payload.devices) {
            if (!dev.type) { report.errors++; report.details.push({ dev, error: 'type missing' }); continue; }
            if (!dev.slug && !dev.id) { report.errors++; report.details.push({ dev, error: 'slug or id required' }); continue; }
            if (dev.slug) incomingKeys.add(`${dev.type}#${dev.slug}`);
        }

        for (const dev of payload.devices as ExportedDevice[]) {
            try {
                const kind = getKind(dev.type); // validiert Typ
                // Lookup: 1) per (type,slug), 2) per id
                let existing: Device | null = null;
                if (dev.slug) existing = await this.devices.findOne({ where: { type: dev.type, slug: dev.slug } });
                if (!existing && dev.id) existing = await this.devices.findOne({ where: { id: dev.id } });

                if (!existing) {
                    // Create
                    const res = await this.createDevice(dev.type, dev.name, dev.slug, dev.capabilities, dev.templateId ?? undefined);
                    // telemetry setzen
                    if (typeof dev.telemetryIntervalSec === 'number') {
                        await this.updateTelemetry(res.id, dev.telemetryIntervalSec);
                    }
                    // state setzen (optional)
                    if (dev.state && Object.keys(dev.state).length > 0) {
                        await this.states.update({ deviceId: res.id }, { data: dev.state });
                        this.mqtt.publish(topics.state(this.ns, dev.type, res.id), dev.state, { retain: true });
                    }
                    report.created++;
                    report.details.push({ id: res.id, action: 'created' });
                } else {
                    // Update falls Unterschiede
                    const before = JSON.stringify({
                        name: existing.name,
                        capabilities: existing.capabilities,
                        templateId: existing.templateId ?? null,
                        telemetry: existing.telemetryIntervalSec,
                    });
                    const patch: Partial<Device> = {};
                    if (typeof dev.name === 'string' && dev.name && dev.name !== existing.name) patch.name = dev.name;
                    if (dev.templateId !== undefined && dev.templateId !== existing.templateId) patch.templateId = dev.templateId!;
                    if (dev.capabilities && JSON.stringify(dev.capabilities) !== JSON.stringify(existing.capabilities)) {
                        patch.capabilities = { ...existing.capabilities, ...dev.capabilities };
                    }
                    if (Object.keys(patch).length > 0) {
                        await this.devices.update({ id: existing.id }, patch);
                        const updated = await this.devices.findOneBy({ id: existing.id });
                        if (updated) this.publishDiscoveryIfEnabled(updated);
                    }
                    if (typeof dev.telemetryIntervalSec === 'number' && dev.telemetryIntervalSec !== existing.telemetryIntervalSec) {
                        await this.updateTelemetry(existing.id, dev.telemetryIntervalSec);
                    }
                    if (dev.state && Object.keys(dev.state).length > 0) {
                        await this.states.update({ deviceId: existing.id }, { data: dev.state });
                        this.mqtt.publish(topics.state(this.ns, dev.type, existing.id), dev.state, { retain: true });
                    }
                    const after = JSON.stringify({
                        name: (patch.name ?? existing.name),
                        capabilities: (patch.capabilities ?? existing.capabilities),
                        templateId: (patch.templateId ?? existing.templateId),
                        telemetry: (typeof dev.telemetryIntervalSec === 'number' ? dev.telemetryIntervalSec : existing.telemetryIntervalSec),
                    });
                    if (before !== after) {
                        report.updated++;
                        report.details.push({ id: existing.id, action: 'updated' });
                    } else {
                        report.unchanged++;
                        report.details.push({ id: existing.id, action: 'unchanged' });
                    }
                }
            } catch (e: any) {
                report.errors++;
                report.details.push({ dev, error: e?.message || String(e) });
            }
        }

        if (payload.replaceAll) {
            // Lösche alle vorhandenen Geräte, die NICHT in incomingKeys (type+slug) sind.
            const current = await this.devices.find();
            const toDelete = current.filter(d => d.slug && !incomingKeys.has(`${d.type}#${d.slug}`));
            if (toDelete.length) {
                for (const d of toDelete) await this.remove(d.id);
                report.deleted += toDelete.length;
            }
        }

        return report;
    }
}
