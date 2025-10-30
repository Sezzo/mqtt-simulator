export type LightState = { state: 'ON'|'OFF'; brightness: number; colorTemp: number };
export type LightCmd = Partial<LightState>;
export const reduceLight = (prev: LightState, cmd: LightCmd): LightState => ({
    state: cmd.state ? (cmd.state === 'ON' ? 'ON' : 'OFF') : prev.state,
    brightness: Math.max(0, Math.min(255, cmd.brightness ?? prev.brightness)),
    colorTemp: Math.max(153, Math.min(500, cmd.colorTemp ?? prev.colorTemp)),
});
