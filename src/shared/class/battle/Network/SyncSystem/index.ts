import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import State from "../../State";
import Entity from "../../State/Entity";
import { AttackAction, NeoClashResult } from "../../types";
import { NetworkService } from "../NetworkService";
import { attackActionRefVerification, clashesVerification, entityMovedEventDataVerification, entityUpdateEventDataVerification, gridCellUpdatedEventDataVerification, turnStartedEventDataVerification } from "./veri";

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
        private gameState: State,
        private networkService: NetworkService,
        private eventBus: EventBus
    ) {
        this.logger.info("Initializing SyncSystem");
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for game state changes
     */
    private setupEventListeners(): void {
        this.logger.debug("Setting up listeners for game state changes");
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.ENTITY_MOVED, (data: unknown) => {
                const veri = entityMovedEventDataVerification(data);
                if (!veri) {
                    this.logger.warn(`Entity moved event received with invalid data`);
                    return;
                }
                this.logger.debug(`Entity movement detected: ID ${(data as EntityMovedEventData).entityId} from (${(data as EntityMovedEventData).from.X}, ${(data as EntityMovedEventData).from.Y}) to (${(data as EntityMovedEventData).to.X}, ${(data as EntityMovedEventData).to.Y})`);
                this.broadcastEntityMove(data as EntityMovedEventData);
            }),
            this.eventBus.subscribe(GameEvent.ENTITY_UPDATED, (entity: unknown) => {
                const entityVerification = entityUpdateEventDataVerification(entity);
                if (!entityVerification) {
                    this.logger.warn(`Entity update event received with invalid data`);
                    return;
                }
                const e = entity as unknown as Entity;
                this.logger.debug(`Entity update detected: ${e.name} (ID: ${e.playerID})`);
                this.broadcastEntityUpdate(e);
            }),
            this.eventBus.subscribe(GameEvent.GRID_UPDATED, (gridData) => {
                this.logger.debug("Grid update detected");
                this.broadcastGridUpdate();
            }),
            this.eventBus.subscribe(GameEvent.TURN_STARTED, (entity: unknown) => {
                const entityVerification = turnStartedEventDataVerification(entity);
                if (!entityVerification) {
                    this.logger.warn(`Turn change event received with invalid data`);
                    return;
                }
                const e = entity as { playerID: number; entityId: number; position: Vector2 };
                this.logger.info(`Turn started for entity ID: ${e.playerID}`);
                this.broadcastTurnChange(e);
            }),
            this.eventBus.subscribe(GameEvent.GRID_CELL_UPDATED, (data: unknown) => {
                const veri = gridCellUpdatedEventDataVerification(data);

                if (!veri) {
                    this.logger.warn(`Grid cell update event received with invalid data`, data as defined);
                    return;
                }

                this.logger.debug(`Grid cell update: from (${(data as GridCellUpdatedEventData).previousPosition.X}, ${(data as GridCellUpdatedEventData).previousPosition.Y}) to (${(data as GridCellUpdatedEventData).newPosition.X}, ${(data as GridCellUpdatedEventData).newPosition.Y})`);

                // This can be handled by the general grid update broadcast if needed
                // For more granular updates in the future, we could add specific handling here
            }),
            this.eventBus.subscribe(GameEvent.COMBAT_STARTED, (clashes: unknown, attackActionRef: unknown) => {
                const veriClashes = clashesVerification(clashes);
                if (!veriClashes) {
                    this.logger.warn(`Combat started event received with invalid data`, clashes as defined);
                    return;
                }
                const veriAttackActionRef = attackActionRefVerification(attackActionRef);
                if (!veriAttackActionRef) {
                    print(attackActionRef)
                    this.logger.warn(`Attack action reference event received with invalid data`, attackActionRef as defined);
                    return;
                }

                this.logger.debug(`Combat result received with ${(clashes as NeoClashResult[]).size()} clash results`);
                this.broadcastCombatStart(clashes, attackActionRef);
            }),
            this.eventBus.subscribe(GameEvent.READINESS_UPDATED, (_) => {
                this.logger.debug("Readiness updated event received");
                const players = this.gameState.getAllPlayers();
                this.logger.debug(`Broadcasting to ${players.size()} players`);

                // Notify each player of the combat results
                for (const player of players) {
                    this.logger.debug(`Sending combat results to player ${player.Name}`);
                    this.networkService.tickLocalGauntlet(player)
                }
            })
        );


        // remotes.battle.ui.mount.actionMenu.connect(() => this.handleActionMenuMount()),
        // remotes.battle.ui.mount.otherPlayersTurn.connect(() => this.handleOtherPlayersTurn()),
        // remotes.battle.forceUpdate.connect(() => this.handleForceUpdate()),
        // remotes.battle.animate.connect((ac) => this.handleAnimationRequest(ac)),
        // remotes.battle.camera.hoi4.connect(() => this.handleCameraHoi4Mode()),
        // remotes.battle.chosen.connect(() => this.handleEntityChosen())
    }

    private broadcastCombatStart(clashes: NeoClashResult[], attackActionRef: AttackAction): void {
        this.logger.info(`Broadcasting combat started with ${clashes.size()} clash results`);
        // Get all players that need to be notified
        const players = this.gameState.getAllPlayers();
        this.logger.debug(`Broadcasting to ${players.size()} players`);

        // Notify each player of the combat results
        for (const player of players) {
            this.logger.debug(`Sending combat results to player ${player.Name}`);
            this.networkService.sendCombatResults(player, clashes, attackActionRef);
        }
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
