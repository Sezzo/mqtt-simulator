import { Device } from './device.entity';
import { topics } from '../mqtt/topics';

export function buildDiscoveryPayload(ns: string, d: Device) {
    return {
        id: d.id,
        type: d.type,
        name: d.name,
        slug: d.slug ?? null,
        templateId: d.templateId ?? null,
        capabilities: d.capabilities ?? {},
        topics: {
            cmd:   topics.cmd(ns, d.type, d.id),
            state: topics.state(ns, d.type, d.id),
            status:topics.status(ns, d.type, d.id),
        },
        createdAt: d.createdAt,
        // Platzhalter für künftige Erweiterungen:
        meta: {
            simulator: 'mqtt-sim',
            version: '0.1.0',
        },
    };
}
