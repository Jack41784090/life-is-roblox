import Logger from "shared/utils/Logger";
import { EffectType } from "./types";

type EventCallback = (...args: unknown[]) => void;

export default class EffectsEventBus {
    private static instance?: EffectsEventBus = undefined
    private logger = Logger.createContextLogger("EffectsEventBus🎉🎉");
    private events: Map<string, Set<EventCallback>> = new Map();

    public static getInstance(): EffectsEventBus {
        if (!this.instance) {
            this.instance = new EffectsEventBus();
            // this.instance.logger.info("EffectsEventBus: Created instance");
        }
        return this.instance;
    }

    private constructor() { }

    public subscribe(eventName: EffectType, callback: EventCallback): () => void {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        const callbacks = this.events.get(eventName)!;
        callbacks.add(callback);

        return () => {
            callbacks.delete(callback);
            if (callbacks.size() === 0) { // Fixed: size is a property, not a method
                this.events.delete(eventName);
            }
        };
    }

    public emit(eventName: EffectType, ...args: (undefined | defined)[]): void {
        this.logger.info(`${eventName}`, ...args);
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(...args);
            }
        }
    }
}