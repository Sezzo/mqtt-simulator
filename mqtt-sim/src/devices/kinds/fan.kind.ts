import { DeviceKind } from './device-kind';

type FanState = {
    state: 'ON'|'OFF';
    speed: number;   // 0..max
};

export const FanKind: DeviceKind<FanState> = {
    id: 'fan',
    title: 'Fan',
    capabilities: () => ({
        maxSpeed: 3,     // Stufen: 0..3 (0=aus)
        defaultSpeed: 1, // wenn ON ohne speed gesetzt
    }),
    defaultTelemetryInterval: () => 0, // Keine Telemetrie notwendig (ereignisgesteuert)
    defaultState: (caps) => {
        const c = { ...FanKind.capabilities(), ...(caps||{}) };
        return { state:'OFF', speed: 0 };
    },
    validate: (cmd, caps) => {
        const c = { ...FanKind.capabilities(), ...(caps||{}) };
        if (cmd.state && !['ON','OFF'].includes(cmd.state)) throw new Error('state must be ON|OFF');
        if (cmd.speed != null && (cmd.speed < 0 || cmd.speed > c.maxSpeed)) {
            throw new Error(`speed 0..${c.maxSpeed}`);
        }
    },
    reduce: (prev, cmd, caps) => {
        const c = { ...FanKind.capabilities(), ...(caps||{}) };
        const next: FanState = { ...prev };
        if (cmd.state) {
            next.state = cmd.state === 'ON' ? 'ON' : 'OFF';
            if (next.state === 'OFF') next.speed = 0;
            if (next.state === 'ON' && next.speed === 0) next.speed = c.defaultSpeed;
        }
        if (typeof cmd.speed === 'number') {
            next.speed = Math.max(0, Math.min(c.maxSpeed, cmd.speed));
            next.state = next.speed > 0 ? 'ON' : 'OFF';
        }
        return next;
    },
};
