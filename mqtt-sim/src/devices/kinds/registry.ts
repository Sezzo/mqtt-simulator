import { DeviceKind } from './device-kind';
import { LightKind } from './light.kind';
import { SwitchKind } from './switch.kind';
import { TempSensorKind } from './sensor.temp.kind';
import { CoverKind } from './cover.kind';
import { FanKind } from './fan.kind';

const REGISTRY: Record<string, DeviceKind> = {
    [LightKind.id]: LightKind,
    [SwitchKind.id]: SwitchKind,
    [TempSensorKind.id]: TempSensorKind,
    [CoverKind.id]: CoverKind,
    [FanKind.id]: FanKind,
};

export const getKind = (id: string): DeviceKind => {
    const k = REGISTRY[id];
    if (!k) throw new Error(`Unsupported device type: ${id}`);
    return k;
};

export const hasKind = (id: string) => !!REGISTRY[id];

export const listKinds = () =>
    Object.values(REGISTRY).map(k => ({ id: k.id, title: k.title, capabilities: k.capabilities() }));

export const kindIds = () => Object.keys(REGISTRY);
