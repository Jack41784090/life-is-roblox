import Logger from "shared/utils/Logger";

type EventCallback = (...args: unknown[]) => void;

// Add an enum for game event names to ensure consistency
export enum GameEvent {
    // Combat Events
    ENTITY_INTEND_ATTACK = "entity:attack",
    ENTITY_ATTACKED = "entity:attack:confirmed",
    BEFORE_DV_ROLL = "entity:before-dv-roll",
    AFTER_DV_ROLL = "entity:after-dv-roll",
    BEFORE_PV_ROLL = "entity:before-pv-roll",
    AFTER_PV_ROLL = "entity:after-pv-roll",
    ON_TOUCH = "entity:touch",
    ON_DEAL_DAMAGE = "entity:deal-damage",
    ON_MISS = "entity:miss",

    // Entity events
    ENTITY_CREATED = "entity:created",
    ENTITY_UPDATED = "entity:updated",
    ENTITY_REMOVED = "entity:removed",
    ENTITY_INTEND_MOVE = "entity:moved",
    ENTITY_MOVED = "entity:moved:confirmed",

    // Turn events
    TURN_STARTED = "turn:started",
    TURN_ENDED = "turn:ended",

    // Grid Events
    GRID_UPDATED = "grid:updated",
    GRID_CELL_UPDATED = "grid:cell:updated",
    ENTITY_DIES = "ENTITY_DIES",
}

export class EventBus {
    private logger = Logger.createContextLogger("EventBus🎉");
    private events: Map<string, Set<EventCallback>> = new Map();

    constructor() { }

    public subscribe(eventName: GameEvent, callback: EventCallback): () => void {
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

    public emit(eventName: string, ...args: (undefined | defined)[]): void {
        this.logger.info(`${eventName}`, ...args);
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(...args);
            }
        }
    }
}
