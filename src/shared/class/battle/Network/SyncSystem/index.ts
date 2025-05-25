import { ClientRemote } from "@rbxts/remo";
import { RunService } from "@rbxts/services";
import { clientRemotes } from "shared/remote";
import Logger from "shared/utils/Logger";
import { SyncSystemConfig } from "./types";

/**
 * Data interface for entity movement events
 */
export interface EntityMovedEventData {
    entityId: number;
    from: Vector2;
    to: Vector2;
}

/**
 * Data interface for grid cell update events
 */
export interface GridCellUpdatedEventData {
    newPosition: Vector2;
    previousPosition: Vector2;
}
// type Parameters<T> =
//     T extends (...args: infer P) => any ? P : never;
type OmitFirstParameter<T> =
    T extends (first: any, ...rest: infer R) => any
    ? R
    : never;
/**
 * SyncSystem - Handles synchronization between game state and network
 * 
 * Responsibilities:
 * 1. Listen for state changes via EventBus
 * 2. Broadcast state changes to clients
 * 3. Apply state updates from server to client state
 * 4. Handle different sync strategies (full vs. delta)
 */
export class SyncSystem {
    private players: Player[];
    private logger = Logger.createContextLogger("SyncSystem");
    private unsubscribeFunctions: Array<() => void> = [];

    constructor(config: SyncSystemConfig) {
        this.logger.info("Initializing SyncSystem");
        this.players = config.players;
        this.broadcast('createClient', {})
    }

    public addPlayer(player: Player): void {
        // this.logger.debug(`Adding player ${player.Name} to SyncSystem`);
        this.players.push(player);
    }

    public broadcast<T extends keyof typeof clientRemotes>(key: T, ...args: OmitFirstParameter<typeof clientRemotes[T]>): void {
        // this.logger.debug(`Broadcasting ${key} to ${this.players.size()} players`);
        const remote: ClientRemote<unknown[]> = clientRemotes[key] as ClientRemote<unknown[]>;
        if (RunService.IsServer()) {
            for (const player of this.players) {
                remote(player, ...args as OmitFirstParameter<typeof remote.fire>);
            }
        } else {
            throw "Cannot call broadcast() on client";
        }
    }

    /**
     * Clean up event listeners when the sync system is destroyed
     */
    public destroy(): void {
        this.logger.info("Destroying SyncSystem");

        // Unsubscribe from all events
        // this.logger.debug(`Unsubscribing from ${this.unsubscribeFunctions.size()} events`);
        for (const unsubscribe of this.unsubscribeFunctions) {
            unsubscribe();
        }
        this.unsubscribeFunctions = [];

        // this.logger.debug("SyncSystem destroyed");
    }
}
