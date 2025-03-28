import { t } from "@rbxts/t";
import { extractMapValues } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import Entity from "../Entity";
import { EntityInit, EntityUpdate } from "../Entity/types";

/**
 * Manages game entities within the battle system
 */
export class EntityManager {
    private logger = Logger.createContextLogger("EntityManager");
    private entities: Map<number, Entity> = new Map();

    constructor(private eventBus?: EventBus) {
        this.logger.info("EntityManager initialized");
        if (this.eventBus) {
            this.eventBus.subscribe(GameEvent.ENTITY_REMOVED, (id: unknown) => {
                t.number(id);
                this.logger.info(`Entity removed: ${id}`);
            });
        }
    }

    //#region Initialization

    /**
     * Creates a new entity with the specified configuration
     */
    public createEntity(config: EntityInit): Entity {
        this.logger.info(`Creating entity with ID: ${config.playerID}, name: ${config.name}`);
        const entity = new Entity(config);
        this.entities.set(config.playerID, entity);

        // Emit creation event
        if (this.eventBus) {
            this.eventBus.emit(GameEvent.ENTITY_CREATED, entity);
        }

        this.logger.debug(`Entity created: ${entity.name} (${entity.playerID})`);
        return entity;
    }

    /**
     * Bulk create multiple entities at once
     */
    public createEntities(configs: EntityInit[]): Entity[] {
        this.logger.info(`Creating ${configs.size()} entities in bulk`);
        return configs.map(config => this.createEntity(config));
    }

    //#endregion

    //#region Entity Access & Queries

    /**
     * Get entity by its unique ID
     */
    public getEntity(id: number): Entity | undefined {
        const entity = this.entities.get(id);
        if (!entity) {
            this.logger.debug(`Entity with ID ${id} not found`);
        }
        return entity;
    }

    /**
     * Get all entities in the manager
     */
    public getAllEntities(filter: (e: Entity) => boolean = (e => true)): Entity[] {
        const entities = extractMapValues(this.entities, filter);
        this.logger.debug(`Retrieved ${entities.size()} entities`);
        return entities;
    }

    /**
     * Find entity at the specified grid position
     */
    public findEntityAtPosition(qr: Vector2): Entity | undefined {
        this.logger.debug(`Searching for entity at position (${qr.X}, ${qr.Y})`);
        for (const [_, entity] of this.entities) {
            if (entity.qr.X === qr.X && entity.qr.Y === qr.Y) {
                this.logger.debug(`Found entity ${entity.name} (${entity.playerID}) at position (${qr.X}, ${qr.Y})`);
                return entity;
            }
        }
        this.logger.debug(`No entity found at position (${qr.X}, ${qr.Y})`);
        return undefined;
    }

    /**
     * Get all entities within a specified distance of a position
     */
    public getEntitiesInRange(position: Vector2, range: number): Entity[] {
        this.logger.debug(`Finding entities in range ${range} from position (${position.X}, ${position.Y})`);
        const entitiesInRange = this.getAllEntities().filter(entity => {
            const dx = entity.qr.X - position.X;
            const dy = entity.qr.Y - position.Y;
            // Using hex grid distance calculation
            return (math.abs(dx) + math.abs(dy) + math.abs(dx - dy)) / 2 <= range;
        });
        this.logger.debug(`Found ${entitiesInRange.size()} entities in range ${range}`);
        return entitiesInRange;
    }

    //#endregion

    //#region Entity Management

    /**
     * Update an entity with new data
     */
    public updateEntity(id: number, updates: EntityUpdate): void {
        const entity = this.getEntity(id);
        if (entity) {
            this.logger.info(`Updating entity ${entity.name} (${id})`, updates);
            entity.update(updates);

            // Emit update event
            if (this.eventBus) {
                this.eventBus.emit(GameEvent.ENTITY_UPDATED, entity, updates);
            }
        } else {
            this.logger.warn(`Failed to update entity: Entity with ID ${id} not found`);
        }
    }

    /**
     * Remove an entity from the manager
     */
    public removeEntity(id: number): boolean {
        const entity = this.getEntity(id);
        if (entity) {
            this.logger.info(`Removing entity ${entity.name} (${id})`);
        } else {
            this.logger.warn(`Attempted to remove non-existent entity with ID ${id}`);
        }

        const result = this.entities.delete(id);

        // Emit removal event
        if (result && entity && this.eventBus) {
            this.eventBus.emit(GameEvent.ENTITY_REMOVED, id, entity);
        }

        this.logger.debug(`Entity removal ${result ? "successful" : "failed"} for ID ${id}`);
        return result;
    }

    /**
     * Check if an entity exists in the manager
     */
    public hasEntity(id: number): boolean {
        const exists = this.entities.has(id);
        this.logger.debug(`Entity existence check: ID ${id} ${exists ? "exists" : "does not exist"}`);
        return exists;
    }

    /**
     * Clear all entities from the manager
     */
    public clearEntities(): void {
        const count = this.entities.size();
        this.logger.info(`Clearing all entities (${count} entities)`);
        this.entities.clear();
        this.logger.debug(`All entities cleared`);
    }

    //#endregion

    //#region Utility Methods

    /**
     * Count the total number of entities
     */
    public getEntityCount(): number {
        const count = this.entities.size();
        this.logger.debug(`Current entity count: ${count}`);
        return count;
    }

    /**
     * Check if the position is occupied by any entity
     */
    public isPositionOccupied(qr: Vector2): boolean {
        const isOccupied = this.findEntityAtPosition(qr) !== undefined;
        this.logger.debug(`Position (${qr.X}, ${qr.Y}) is ${isOccupied ? "occupied" : "not occupied"}`);
        return isOccupied;
    }

    //#endregion
}
