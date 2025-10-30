export interface DeviceKind<TState = any, TCmd = Partial<TState>> {
    id: string;                 // e.g. "light"
    title: string;
    capabilities: () => Record<string, any>; // Standard-Caps
    defaultState: (caps?: Record<string, any>) => TState;
    defaultTelemetryInterval?: () => number; // Standard-Telemetrie in Sekunden (0 = deaktiviert)
    validate?: (cmd: any, caps?: Record<string, any>) => void;
    reduce: (prev: TState, cmd: TCmd, caps?: Record<string, any>) => TState;

    /**
     * Optionaler Telemetrie-Hook. Wird vor jedem Heartbeat aufgerufen.
     * Kann den State verändern (z. B. Messwert-Drift). Gibt den "nächsten" State zurück.
     * Wenn nicht implementiert, wird der State unverändert gelassen.
     */
    tick?: (prev: TState, caps?: Record<string, any>) => TState;
}
