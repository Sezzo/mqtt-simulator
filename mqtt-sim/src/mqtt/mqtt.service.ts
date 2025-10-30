import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { IClientOptions, MqttClient } from 'mqtt';

type Handler = (topic: string, msg: Buffer) => void;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
    private readonly log = new Logger(MqttService.name);
    private client!: MqttClient;

    // Exact-topic Handler (selten gebraucht, bleibt verfügbar)
    private handlers = new Map<string, Handler>();

    // Wildcard-Command-Router
    private cmdHandler?: (args: { type: string; id: string; payload: Buffer }) => void;
    private cmdWildcardSubscribed = false;

    private connected = false;

    readonly ns: string;
    readonly qos: 0 | 1 | 2;
    readonly retained: boolean;

    constructor(private cfg: ConfigService) {
        this.ns = cfg.get('MQTT_NAMESPACE', 'sim');
        this.qos = Number(cfg.get('MQTT_QOS', 1)) as 0 | 1 | 2;
        this.retained = cfg.get('MQTT_RETAINED', 'true') === 'true';
    }

    onModuleInit() {
        const url = this.cfg.get<string>('MQTT_URL');
        if (!url) throw new Error('MQTT_URL missing');

        const willTopic = `${this.ns}/service/status`;
        const opts: IClientOptions = {
            username: this.cfg.get('MQTT_USERNAME') || undefined,
            password: this.cfg.get('MQTT_PASSWORD') || undefined,
            will: { topic: willTopic, payload: 'offline', qos: this.qos, retain: true },
            clean: true,
            reconnectPeriod: 2000,
        };
        this.client = mqtt.connect(url, opts);

        this.client.on('connect', () => {
            this.connected = true;
            this.log.log('MQTT connected');
            this.publish(willTopic, 'online', { retain: true });
            // Bei Reconnects resubscribt der Broker Wildcards automatisch (clean=true),
            // aber falls gewünscht oder Broker anders konfiguriert ist,
            // kann subscribeCommandsWildcard() idempotent aufgerufen werden.
            if (this.cmdWildcardSubscribed) this.subscribeCommandsWildcard();
        });

        this.client.on('reconnect', () => {
            this.connected = false;
            this.log.warn('MQTT reconnecting…');
        });

        this.client.on('close', () => {
            this.connected = false;
            this.log.warn('MQTT connection closed');
        });

        this.client.on('message', (topic, msg) => {
            // 1) exact-topic handlers (falls genutzt)
            const h = this.handlers.get(topic);
            if (h) h(topic, msg);

            // 2) wildcard command router: sim/<type>/<id>/set
            const parts = topic.split('/');
            if (parts.length === 4 && parts[0] === this.ns && parts[3] === 'set') {
                const [, type, id] = parts;
                if (this.cmdHandler) {
                    try {
                        this.cmdHandler({ type, id, payload: msg });
                    } catch (e: any) {
                        this.log.error(`cmd router error for ${topic}: ${e?.message || e}`);
                    }
                }
            }
        });

        this.client.on('error', (e) => this.log.error(e.message));
    }

    /** Health: true wenn der Client connected ist */
    isConnected() {
        return this.connected;
    }

    /** Publish helper (JSON wenn Objekt) */
    publish(topic: string, payload: any, opts?: { retain?: boolean; qos?: 0 | 1 | 2 }) {
        const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
        this.client.publish(topic, data, {
            retain: opts?.retain ?? this.retained,
            qos: opts?.qos ?? this.qos,
        });
    }

    /** (Selten) exact-Topic-Subscribe */
    subscribe(topic: string, handler: Handler) {
        if (!this.handlers.has(topic)) {
            this.client.subscribe(topic, { qos: this.qos }, (err) => {
                if (err) return this.log.error(`subscribe ${topic}: ${err.message}`);
            });
        }
        this.handlers.set(topic, handler);
    }

    /** (Selten) exact-Topic-Unsubscribe */
    unsubscribe(topic: string) {
        this.handlers.delete(topic);
        this.client?.unsubscribe(topic, (err) => {
            if (err) this.log.error(`unsubscribe ${topic}: ${err.message}`);
        });
    }

    /** Einmalige Wildcard-Subscription für Commands: ${ns}/+/+/set */
    subscribeCommandsWildcard() {
        if (this.cmdWildcardSubscribed) return;
        const pattern = `${this.ns}/+/+/set`;
        this.client.subscribe(pattern, { qos: this.qos }, (err) => {
            if (err) this.log.error(`subscribe ${pattern}: ${err.message}`);
            else this.log.log(`Subscribed wildcard: ${pattern}`);
        });
        this.cmdWildcardSubscribed = true;
    }

    /** Command-Router registrieren */
    onCommand(handler: (args: { type: string; id: string; payload: Buffer }) => void) {
        this.cmdHandler = handler;
    }

    onModuleDestroy() {
        this.client?.end(true);
    }
}
