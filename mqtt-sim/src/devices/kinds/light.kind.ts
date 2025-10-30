import { DeviceKind } from './device-kind';

type RGB = { r:number; g:number; b:number };
type LightState = {
    state: 'ON'|'OFF';
    brightness?: number;   // 0..255
    colorTemp?: number;    // 153..500 (mired)
    color?: RGB;           // 0..255
    mode?: 'white'|'ct'|'rgb';
};

function clamp(v:number, lo:number, hi:number) { return Math.max(lo, Math.min(hi, v)); }
function clampRGB(c: any): RGB {
    return {
        r: clamp(Number(c?.r ?? 255), 0, 255),
        g: clamp(Number(c?.g ?? 255), 0, 255),
        b: clamp(Number(c?.b ?? 255), 0, 255),
    };
}

export const LightKind: DeviceKind<LightState> = {
    id: 'light',
    title: 'Light',
    capabilities: () => ({
        brightness: true,   // default dimmable
        color_temp: false,  // default no CT
        rgb: false,         // default no RGB
    }),
    defaultTelemetryInterval: () => 0, // Keine Telemetrie notwendig (ereignisgesteuert)

    defaultState: (caps) => {
        const c = { ...LightKind.capabilities(), ...(caps||{}) };
        const st: LightState = { state:'OFF' };
        if (c.brightness) st.brightness = 0;
        if (c.color_temp) { st.colorTemp = 350; st.mode = 'ct'; }
        if (c.rgb)        { st.color = { r:255,g:255,b:255 }; st.mode = c.color_temp ? (st.mode ?? 'rgb') : 'rgb'; }
        if (!c.color_temp && !c.rgb) st.mode = 'white';
        return st;
    },

    validate: (cmd: any, caps) => {
        const c = { ...LightKind.capabilities(), ...(caps||{}) };
        if (cmd.state && !['ON','OFF'].includes(cmd.state)) throw new Error('state must be ON|OFF');
        if ('brightness' in cmd) {
            if (!c.brightness) throw new Error('brightness not supported');
            if (cmd.brightness < 0 || cmd.brightness > 255) throw new Error('brightness 0..255');
        }
        if ('colorTemp' in cmd) {
            if (!c.color_temp) throw new Error('color_temp not supported');
            if (cmd.colorTemp < 153 || cmd.colorTemp > 500) throw new Error('colorTemp 153..500');
        }
        if ('color' in cmd) {
            if (!c.rgb) throw new Error('rgb not supported');
            const { r,g,b } = cmd.color ?? {};
            for (const v of [r,g,b]) if (v == null || v < 0 || v > 255) throw new Error('color r/g/b 0..255');
        }
        if ('mode' in cmd) {
            const allowed = ['white', ...(c.color_temp?['ct']:[]), ...(c.rgb?['rgb']:[]) ];
            if (!allowed.includes(cmd.mode)) throw new Error(`mode must be one of ${allowed.join(',')}`);
        }
    },

    reduce: (prev, cmd, caps) => {
        const c = { ...LightKind.capabilities(), ...(caps||{}) };
        const next: LightState = { ...prev };

        if (cmd.state) next.state = cmd.state === 'ON' ? 'ON':'OFF';

        if (c.brightness && typeof cmd.brightness === 'number') {
            next.brightness = clamp(cmd.brightness, 0, 255);
        }

        if (c.color_temp && typeof cmd.colorTemp === 'number') {
            next.colorTemp = clamp(cmd.colorTemp, 153, 500);
            next.mode = 'ct';
        }

        if (c.rgb && cmd.color) {
            next.color = clampRGB(cmd.color);
            next.mode = 'rgb';
        }

        if (cmd.mode) {
            const allowed = ['white', ...(c.color_temp?['ct']:[]), ...(c.rgb?['rgb']:[]) ];
            if (allowed.includes(cmd.mode)) next.mode = cmd.mode as any;
        }

        if (!next.mode) next.mode = c.rgb ? 'rgb' : (c.color_temp ? 'ct' : 'white');
        return next;
    },
};
