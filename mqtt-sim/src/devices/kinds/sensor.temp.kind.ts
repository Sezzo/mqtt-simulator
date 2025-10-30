import { DeviceKind } from './device-kind';

type TempState = {
    value: number;   // aktueller Messwert
    unit: '°C' | 'C';
};

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

export const TempSensorKind: DeviceKind<TempState> = {
    id: 'sensor.temp',
    title: 'Temperature Sensor',

    // Standard-Capabilities (können per Template/DTO überschrieben werden):
    // min/max: Wertebereich; drift: Schritt pro Tick; noise: zufälliges Rauschen; target: Soll (drift in Richtung)
    capabilities: () => ({
        min: 0,          // °C
        max: 40,         // °C
        drift: 0.05,     // °C pro Tick (deterministisch Richtung target, sonst +/-)
        noise: 0.1,      // ± °C zufällig
        target: 22,      // Zieltemperatur (drift Richtung target)
        unit: '°C',
        decimals: 1,     // Ausgabepräzision
    }),

    defaultTelemetryInterval: () => 10, // Aktualisierung alle 10 Sekunden für Drift-Simulation

    defaultState: (caps) => {
        const c = { ...TempSensorKind.capabilities(), ...(caps || {}) };
        const start = typeof c.start === 'number' ? c.start : (c.target ?? 22);
        return {
            value: clamp(start, c.min, c.max),
            unit: (c.unit === 'C' ? 'C' : '°C') as '°C' | 'C',
        };
    },

    validate: (cmd, _caps) => {
        // Sensor ist read-only; optional erlauben wir "force" zum Setzen (für Tests)
        if (cmd && 'value' in cmd && typeof cmd.value !== 'number') {
            throw new Error('value must be a number');
        }
    },

    reduce: (prev, cmd) => {
        if (cmd && typeof cmd.value === 'number') {
            // "force" set (test / override)
            return { ...prev, value: cmd.value };
        }
        return prev;
    },

    tick: (prev, caps) => {
        const c = { ...TempSensorKind.capabilities(), ...(caps || {}) };
        // deterministische Drift Richtung target:
        const towards = typeof c.target === 'number' ? Math.sign((c.target as number) - prev.value) : (Math.random() < 0.5 ? -1 : 1);
        const driftStep = (Math.abs(c.drift) || 0) * (towards || 0);
        // zufälliges Rauschen
        const noise = ((Math.random() * 2) - 1) * (Math.abs(c.noise) || 0); // [-noise, +noise]
        const raw = prev.value + driftStep + noise;
        const nextVal = clamp(raw, c.min, c.max);

        // runden nach decimals (Anzeige ruhiger)
        const decimals = Math.max(0, Math.min(4, Number(c.decimals ?? 1)));
        const factor = Math.pow(10, decimals);
        const rounded = Math.round(nextVal * factor) / factor;

        return { ...prev, value: rounded };
    },
};
