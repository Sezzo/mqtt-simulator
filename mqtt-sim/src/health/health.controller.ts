import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MqttService } from '../mqtt/mqtt.service';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
    constructor(
        private readonly dataSource: DataSource,
        private readonly mqtt: MqttService,
    ) {}

    @ApiOkResponse({ description: 'Liveness' })
    @Get('health')
    @HttpCode(HttpStatus.OK)
    health() {
        return { status: 'ok', uptime: process.uptime() };
    }

    @ApiOkResponse({ description: 'Readiness (DB & MQTT)' })
    @Get('ready')
    async ready() {
        const checks: Record<string, any> = {};
        try {
            const qr = this.dataSource.createQueryRunner();
            await qr.connect();
            await qr.query('SELECT 1');
            await qr.release();
            checks.database = { ok: true };
        } catch (e: any) {
            checks.database = { ok: false, error: e?.message || String(e) };
        }
        checks.mqtt = { ok: this.mqtt.isConnected() };
        const ok = Object.values(checks).every((c: any) => c.ok === true);
        return { status: ok ? 'ok' : 'degraded', ...checks, timestamp: new Date().toISOString() };
    }
}
