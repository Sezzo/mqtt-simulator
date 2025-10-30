import { DeviceKind } from './device-kind';

type Action = 'OPEN' | 'CLOSE' | 'STOP';
type CoverState = {
    position: number;   // 0 (zu) .. 100 (offen)
    action: Action;     // letzte Aktion
    moving?: boolean;   // intern
};

function clamp(n:number, lo:number, hi:number){ return Math.max(lo, Math.min(hi,n)); }

export const CoverKind: DeviceKind<CoverState, Partial<CoverState> & { action?: Action }> = {
    id: 'cover',
    title: 'Cover / Blind',
    capabilities: () => ({
        speedPerTick: 5, // Position-Änderung pro Telemetrie-Tick
        invert: false,   // falls 0=offen/100=zu gewünscht
    }),
    defaultTelemetryInterval: () => 2, // Aktualisierung alle 2 Sekunden für Position-Simulation
    defaultState: (caps) => {
        const c = { ...CoverKind.capabilities(), ...(caps||{}) };
        // Start bei 0 (zu)
        return { position: c.invert ? 100 : 0, action: 'STOP', moving: false };
    },
    validate: (cmd, caps) => {
        if (cmd.position != null && (cmd.position < 0 || cmd.position > 100)) {
            throw new Error('position 0..100');
        }
        if (cmd.action && !['OPEN','CLOSE','STOP'].includes(cmd.action)) {
            throw new Error('action must be OPEN|CLOSE|STOP');
        }
    },
    reduce: (prev, cmd, caps) => {
        const c = { ...CoverKind.capabilities(), ...(caps||{}) };
        const next: CoverState = { ...prev };

        if (typeof cmd.position === 'number') {
            next.position = clamp(cmd.position, 0, 100);
            next.action = 'STOP';
            next.moving = false;
        }
        if (cmd.action) {
            next.action = cmd.action;
            next.moving = cmd.action === 'OPEN' || cmd.action === 'CLOSE';
        }

        // invert Darstellung (nur UI/State-Konvention, wir speichern „physische“ Position)
        if (c.invert) {
            next.position = 100 - next.position;
        }
        // Achtung: Wir wenden invert nur bei Anzeige an — um side-effects zu vermeiden,
        // setzen wir es direkt wieder zurück:
        if (c.invert) {
            next.position = 100 - next.position;
        }
        return next;
    },
    tick: (prev, caps) => {
        const c = { ...CoverKind.capabilities(), ...(caps||{}) };
        if (!prev.moving) return prev;

        let pos = prev.position;
        if (prev.action === 'OPEN') pos += c.speedPerTick;
        if (prev.action === 'CLOSE') pos -= c.speedPerTick;

        pos = clamp(pos, 0, 100);
        const atEnd = (prev.action === 'OPEN' && pos >= 100) || (prev.action === 'CLOSE' && pos <= 0);

        return {
            position: pos,
            action: atEnd ? 'STOP' : prev.action,
            moving: atEnd ? false : true,
        };
    },
};
