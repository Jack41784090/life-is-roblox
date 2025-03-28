import { t } from "@rbxts/t";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../Events/EventBus";
import Entity from "../State/Entity";
import { GameState } from "../State/GameState";
import { EntityManager } from "../State/Managers/EntityManager";

// export class TurnSystemError {
//     constructor(
//         private name: string,
//         private message: string,
//     ) {
//         super(message);
//         this.name = name;
//     }
// }

export class TurnSystem {
    private logger = Logger.createContextLogger("TurnSystem");
    private currentActorId: number | undefined;
    private unsubscribeFunctions: Array<() => void> = [];
    private entityManager: EntityManager
    private eventBus: EventBus
    private gameState: GameState

    constructor(gameState: GameState) {

        this.gameState = gameState;
        this.entityManager = gameState.getEntityManager();
        this.eventBus = gameState.getEventBus();

        // Subscribe to relevant events
        this.setupEventListeners();
    }

    public getCurrentActorID(): number | undefined {
        return this.currentActorId;
    }
    public getCurrentActor(): Entity | undefined {
        if (this.currentActorId) {
            return this.entityManager.getEntity(this.currentActorId);
        }
        return undefined;
    }

    private setupEventListeners(): void {
        // Listen for entity updates that might affect readiness
        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.ENTITY_UPDATED, (_entity: unknown) => {
                const entityVerification = true // Temp
                if (!entityVerification) {
                    this.logger.warn(`Entity update event received with invalid data`);
                    return;
                }
                // Recalculate readiness if necessary properties changed
                this.calculateReadiness([_entity as Entity]);
            })
        );

        this.unsubscribeFunctions.push(
            this.eventBus.subscribe(GameEvent.ENTITY_REMOVED, (id: unknown) => {
                const idVerification = t.number(id);
                if (!idVerification) {
                    this.logger.warn(`Entity removal event received with invalid data`);
                    return;
                }

                // Handle entity removal during turn processing
                if (this.currentActorId === id) {
                    this.endTurn(id);
                    this.progressToNextTurn();
                }
            })
        );
    }

    public calculateReadiness(entities: Entity[]): void {
        // Calculate readiness for entities
        for (const entity of entities) {
            const readiness = entity.get('pos');
            entity.set('pos', math.clamp(readiness + this.calculateReadinessIncrement(entity), 0, 100));
        }

        // Emit readiness updated event
        this.eventBus.emit(GameEvent.READINESS_UPDATED, entities);
    }

    private calculateReadinessIncrement(entity: Entity) {
        return entity.stats.spd + math.random(-0.1, 0.1) * entity.stats.spd;
    }

    public determineNextActor(): Entity | undefined {
        // Determine which entity acts next based on readiness

        const entities = this.entityManager.getAllEntities();
        if (entities.size() === 0) {
            this.logger.warn("Entity list is empty, cannot run readiness gauntlet");
            return;
        }

        while (!entities.some((e) => e.get('pos') >= 100)) {
            this.calculateReadiness(entities);
            this.logger.info("Readiness gauntlet in progress...");
        }

        const nextActor = entities.sort((a, b) => a.get('pos') - b.get('pos') > 0)[0];
        this.logger.info(`Readiness gauntlet winner: ${nextActor.name} (${nextActor.playerID})`);

        if (nextActor) {
            this.eventBus.emit(GameEvent.NEXT_ACTOR_DETERMINED, nextActor);
        }

        return nextActor;
    }

    private startTurn(entityId: number): Entity | undefined {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity) {
            this.logger.warn(`Cannot start turn: Entity ${entityId} not found`);
            return;
        }

        this.currentActorId = entityId;

        // Emit turn started event
        this.eventBus.emit(GameEvent.TURN_STARTED, entity);
        return entity;
    }

    public endTurn(entityId: number): void {
        const entity = this.entityManager.getEntity(entityId);
        if (!entity) {
            this.logger.warn(`Cannot end turn: Entity ${entityId} not found`);
            return;
        }

        // Reset current actor if it's this entity
        if (this.currentActorId === entityId) {
            this.currentActorId = undefined;
        }

        // Emit turn ended event
        this.eventBus.emit(GameEvent.TURN_ENDED, entity);

        // Additional turn end logic
        // ...implementation...
    }

    public progressToNextTurn(): Entity | undefined {
        const nextActor = this.determineNextActor();
        if (nextActor) {
            const players = this.gameState.getAllPlayers();
            const winningClient = players.find(p => p.UserId === nextActor.playerID);
            const winnerEntity = winningClient ? this.entityManager.getEntity(winningClient.UserId) : undefined;

            if (!winningClient) {
                this.logger.warn("No winning player found");
                return;
            }
            else if (!winnerEntity) {
                this.logger.warn("No winning entity found");
                return;
            }

            return this.startTurn(nextActor.playerID);
        }
        else {
            this.logger.error("No next actor determined");
        }
    }

    // Clean up event listeners when system is destroyed
    public destroy(): void {
        this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFunctions = [];
    }
}
