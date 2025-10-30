import { DeviceKind } from './device-kind';
type SwitchState = { state:'ON'|'OFF' };

export const SwitchKind: DeviceKind<SwitchState> = {
    id: 'switch',
    title: 'Switch',
    capabilities: () => ({}),
    defaultTelemetryInterval: () => 0, // Keine Telemetrie notwendig (ereignisgesteuert)
    defaultState: () => ({ state:'OFF' }),
    validate: (cmd) => {
        if (cmd.state && !['ON','OFF'].includes(cmd.state)) throw new Error('state must be ON|OFF');
    },
    reduce: (prev, cmd) => ({ state: cmd.state ? (cmd.state === 'ON' ? 'ON' : 'OFF') : prev.state }),
};
