import { extractMapValues } from "shared/utils";
import Entity from "../Entity";
import { EntityInit, EntityUpdate } from "../Entity/types";

/**
 * Manages game entities within the battle system
 */
export class EntityManager {
    private entities: Map<number, Entity> = new Map();

    //#region Initialization

    /**
     * Creates a new entity with the specified configuration
     */
    public createEntity(config: EntityInit): Entity {
        const entity = new Entity(config);
        this.entities.set(config.playerID, entity);
        return entity;
    }

    /**
     * Bulk create multiple entities at once
     */
    public createEntities(configs: EntityInit[]): Entity[] {
        return configs.map(config => this.createEntity(config));
    }

    //#endregion

    //#region Entity Access & Queries

    /**
     * Get entity by its unique ID
     */
    public getEntity(id: number): Entity | undefined {
        return this.entities.get(id);
    }

    /**
     * Get all entities in the manager
     */
    public getAllEntities(): Entity[] {
        return extractMapValues(this.entities);
    }

    /**
     * Find entity at the specified grid position
     */
    public findEntityAtPosition(qr: Vector2): Entity | undefined {
        for (const [_, entity] of this.entities) {
            if (entity.qr.X === qr.X && entity.qr.Y === qr.Y) {
                return entity;
            }
        }
        return undefined;
    }

    /**
     * Get all entities within a specified distance of a position
     */
    public getEntitiesInRange(position: Vector2, range: number): Entity[] {
        return this.getAllEntities().filter(entity => {
            const dx = entity.qr.X - position.X;
            const dy = entity.qr.Y - position.Y;
            // Using hex grid distance calculation
            return (math.abs(dx) + math.abs(dy) + math.abs(dx - dy)) / 2 <= range;
        });
    }

    //#endregion

    //#region Entity Management

    /**
     * Update an entity with new data
     */
    public updateEntity(id: number, updates: EntityUpdate): void {
        const entity = this.getEntity(id);
        if (entity) {
            entity.update(updates);
        }
    }

    /**
     * Remove an entity from the manager
     */
    public removeEntity(id: number): boolean {
        return this.entities.delete(id);
    }

    /**
     * Check if an entity exists in the manager
     */
    public hasEntity(id: number): boolean {
        return this.entities.has(id);
    }

    /**
     * Clear all entities from the manager
     */
    public clearEntities(): void {
        this.entities.clear();
    }

    //#endregion

    //#region Utility Methods

    /**
     * Count the total number of entities
     */
    public getEntityCount(): number {
        return this.entities.size();
    }

    /**
     * Check if the position is occupied by any entity
     */
    public isPositionOccupied(qr: Vector2): boolean {
        return this.findEntityAtPosition(qr) !== undefined;
    }

    //#endregion
}
