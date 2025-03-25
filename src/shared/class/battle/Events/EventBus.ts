type EventCallback = (...args: unknown[]) => void;

export class EventBus {
    private events: Map<string, Set<EventCallback>> = new Map();

    public subscribe(eventName: string, callback: EventCallback): () => void {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        const callbacks = this.events.get(eventName)!;
        callbacks.add(callback);

        return () => {
            callbacks.delete(callback);
            if (callbacks.size() === 0) {
                this.events.delete(eventName);
            }
        };
    }

    public emit(eventName: string, ...args: unknown[]): void {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(...args);
            }
        }
    }
}
