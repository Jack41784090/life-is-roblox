import { t } from "@rbxts/t";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../Events/EventBus";
import Entity from "../State/Entity";
import { GameState } from "../State/GameState";
import { NetworkService } from "./NetworkService";

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
    private logger = Logger.createContextLogger("SyncSystem");
    private unsubscribeFunctions: Array<() => void> = [];

    constructor(
        private gameState: GameState,
        private networkService: NetworkService,
        private eventBus: EventBus
    ) {
        this.logger.info("Initializing SyncSystem");
        // Initialize the sync system
        this.initialize();
    }

    /**
     * Initialize the sync system by setting up event listeners
     */
    public initialize(): void {
        this.logger.info("Setting up event listeners");
        // Set up event listeners for state changes
        this.setupEventListeners();
        this.logger.debug("SyncSystem initialization complete");
    }

    /**
     * Set up event listeners for game state changes
     */
    private setupEventListeners(): void {
        this.logger.debug("Subscribing to entity movement events");
        // Listen for entity movements
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.ENTITY_MOVED, (data: unknown) => {
                const veri = t.interface({
                    entityId: t.number,
                    from: t.Vector2,
                    to: t.Vector2,
                })(data);
                if (!veri) {
                    this.logger.warn(`Entity moved event received with invalid data`);
                    return;
                }
                this.logger.debug(`Entity movement detected: ID ${(data as EntityMovedEventData).entityId} from (${(data as EntityMovedEventData).from.X}, ${(data as EntityMovedEventData).from.Y}) to (${(data as EntityMovedEventData).to.X}, ${(data as EntityMovedEventData).to.Y})`);
                this.broadcastEntityMove(data as EntityMovedEventData);
            })
        );

        this.logger.debug("Subscribing to entity update events");
        // Listen for entity updates
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.ENTITY_UPDATED, (entity: unknown) => {
                const entityVerification = t.interface({
                    playerID: t.number,
                    entityId: t.number,
                    position: t.Vector2,
                })(entity);
                if (!entityVerification) {
                    this.logger.warn(`Entity update event received with invalid data`);
                    return;
                }
                const e = entity as unknown as Entity;
                this.logger.debug(`Entity update detected: ${e.name} (ID: ${e.playerID})`);
                this.broadcastEntityUpdate(e);
            })
        );

        this.logger.debug("Subscribing to grid update events");
        // Listen for grid changes
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.GRID_UPDATED, (gridData) => {
                this.logger.debug("Grid update detected");
                this.broadcastGridUpdate();
            })
        );

        this.logger.debug("Subscribing to turn start events");
        // Listen for turn changes
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.TURN_STARTED, (entity: unknown) => {
                const entityVerification = t.interface({
                    playerID: t.number,
                })(entity);
                if (!entityVerification) {
                    this.logger.warn(`Turn change event received with invalid data`);
                    return;
                }
                const e = entity as { playerID: number; entityId: number; position: Vector2 };
                this.logger.info(`Turn started for entity ID: ${e.playerID}`);
                this.broadcastTurnChange(e);
            })
        );

        this.logger.debug("Subscribing to grid cell update events");
        // Listen for grid cell updates
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.GRID_CELL_UPDATED, (data: unknown) => {
                const veri = t.interface({
                    newPosition: t.Vector2,
                    previousPosition: t.Vector2,
                })(data);

                if (!veri) {
                    this.logger.warn(`Grid cell update event received with invalid data`);
                    return;
                }

                this.logger.debug(`Grid cell update: from (${(data as GridCellUpdatedEventData).previousPosition.X}, ${(data as GridCellUpdatedEventData).previousPosition.Y}) to (${(data as GridCellUpdatedEventData).newPosition.X}, ${(data as GridCellUpdatedEventData).newPosition.Y})`);

                // This can be handled by the general grid update broadcast if needed
                // For more granular updates in the future, we could add specific handling here
            })
        );
    }

    /**
     * Broadcast entity movement to all clients
     */
    private broadcastEntityMove(data: EntityMovedEventData): void {
        this.logger.info(`Broadcasting entity movement: ID ${data.entityId}`);
        // Get all players that need to be notified
        const players = this.gameState.getAllPlayers();
        this.logger.debug(`Broadcasting to ${players.size()} players`);

        // Notify each player of the entity movement
        for (const player of players) {
            this.logger.debug(`Sending entity movement to player ${player.Name}`);
            this.networkService.sendEntityMoved(player, data);
        }
    }

    /**
     * Broadcast entity update to all clients
     */
    private broadcastEntityUpdate(entity: Entity): void {
        this.logger.info(`Broadcasting entity update: ${entity.name} (ID: ${entity.playerID})`);
        // Get all players that need to be notified
        const players = this.gameState.getAllPlayers();
        this.logger.debug(`Broadcasting to ${players.size()} players`);

        // Force state update for all clients
        for (const player of players) {
            this.logger.debug(`Sending entity update to player ${player.Name}`);
            this.networkService.forceClientUpdate(player);
        }
    }

    /**
     * Broadcast grid update to all clients
     */
    private broadcastGridUpdate(): void {
        this.logger.info("Broadcasting grid update");
        // Get all players that need to be notified
        const players = this.gameState.getAllPlayers();
        this.logger.debug(`Broadcasting to ${players.size()} players`);

        // Force state update for all clients
        for (const player of players) {
            this.logger.debug(`Sending grid update to player ${player.Name}`);
            this.networkService.forceClientUpdate(player);
        }
    }

    /**
     * Broadcast turn change to all clients
     */
    private broadcastTurnChange(entity: { playerID: number; entityId: number; position: Vector2 }): void {
        this.logger.info(`Broadcasting turn change for entity ID: ${entity.playerID}`);
        // Get all players that need to be notified
        const players = this.gameState.getAllPlayers();
        this.logger.debug(`Broadcasting to ${players.size()} players`);

        // Notify each player of whose turn it is
        for (const player of players) {
            if (player.UserId === entity.playerID) {
                this.logger.debug(`Notifying player ${player.Name} it's their turn`);
                // Notify player it's their turn
                this.networkService.notifyPlayerChosen(player);
                this.networkService.mountActionMenu(player);
            } else {
                this.logger.debug(`Notifying player ${player.Name} it's someone else's turn`);
                // Notify other players it's someone else's turn
                this.networkService.mountOtherPlayersTurn(player);
            }
        }
    }

    /**
     * Sync a specific client's state with the server state
     */
    public syncClientState(player: Player): void {
        this.logger.info(`Syncing state for player: ${player.Name}`);
        // Force client to update their state
        this.networkService.forceClientUpdate(player);
    }

    /**
     * Clean up event listeners when the sync system is destroyed
     */
    public destroy(): void {
        this.logger.info("Destroying SyncSystem");

        // Unsubscribe from all events
        this.logger.debug(`Unsubscribing from ${this.unsubscribeFunctions.size()} events`);
        for (const unsubscribe of this.unsubscribeFunctions) {
            unsubscribe();
        }
        this.unsubscribeFunctions = [];

        this.logger.debug("SyncSystem destroyed");
    }
}
