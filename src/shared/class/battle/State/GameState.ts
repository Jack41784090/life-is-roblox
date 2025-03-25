import { MOVEMENT_COST } from "shared/const";
import { BattleAction, ClashResult, MoveAction, StateConfig, StateState } from "shared/types/battle-types";
import Entity from "./Entity";
import { EntityInit, ReadonlyEntityState } from "./Entity/types";
import HexCell from "./Hex/Cell";
import { ReadonlyGridState } from "./Hex/types";
import { EntityManager } from "./Managers/EntityManager";
import { GridManager } from "./Managers/GridManager";
import { TeamManager } from "./Managers/TeamManager";

/**
 * Main game state controller that manages entities, grid, and teams
 * Handles all state transitions and game actions
 */
export class GameState {
    private entityManager: EntityManager;
    private gridManager: GridManager;
    private teamManager: TeamManager;
    private creID: number | undefined;

    constructor(config: StateConfig) {
        this.gridManager = new GridManager(config);
        this.entityManager = new EntityManager();
        this.teamManager = new TeamManager();
    }

    //#region Manager Access
    /**
     * Returns the entity manager instance
     */
    public getEntityManager(): EntityManager {
        return this.entityManager;
    }

    /**
     * Returns the grid manager instance
     */
    public getGridManager(): GridManager {
        return this.gridManager;
    }

    /**
     * Returns the team manager instance
     */
    public getTeamManager(): TeamManager {
        return this.teamManager;
    }
    //#endregion

    //#region Entity Management
    /**
     * Creates a new entity and adds it to the specified team
     * @param team - Team identifier
     * @param entityInit - Entity initialization data
     * @returns Newly created entity
     */
    public createEntity(team: string, entityInit: EntityInit): Entity {
        const entity = this.entityManager.createEntity(entityInit);
        this.teamManager.addEntityToTeam(team, entity);
        this.setCell(entity, entityInit.qr);

        return entity;
    }
    //#endregion

    //#region Positioning and Grid Management
    /**
     * Places an entity in a cell specified by Vector2 coordinates
     * @param entity - Entity to place
     * @param qr - Vector2 coordinates
     */
    public setCell(entity: Entity, qr: Vector2): void;
    /**
     * Places an entity in a cell specified by X,Y coordinates
     * @param entity - Entity to place
     * @param X - X coordinate
     * @param Y - Y coordinate
     */
    public setCell(entity: Entity, X: number, Y: number): void;
    /**
     * Places an entity directly in a specified cell
     * @param entity - Entity to place
     * @param cell - Target HexCell
     */
    public setCell(entity: Entity, cell: HexCell): void;
    public setCell(entity: Entity, qrOrXOrCell: Vector2 | number | HexCell, Y?: number): void {
        let cell: HexCell | undefined;

        if (typeIs(qrOrXOrCell, "number") && typeIs(Y, "number")) {
            cell = this.gridManager.getCell(new Vector2(qrOrXOrCell, Y));
        } else if (typeIs(qrOrXOrCell, "Vector2")) {
            cell = this.gridManager.getCell(qrOrXOrCell);
        } else if (typeIs(qrOrXOrCell, "table")) {
            cell = qrOrXOrCell as HexCell;
        }

        if (!cell) {
            warn(`[GameState] Cell not found for entity ${entity.playerID}`);
            return;
        }

        const previousPosition = entity.qr || new Vector2(0, 0);
        entity.setCell(cell.qr());
        cell.pairWith(entity);
    }

    /**
     * Finds an entity by its player ID
     * @param playerID - ID of the entity to find
     * @returns Entity if found, undefined otherwise
     */
    public getEntity(playerID: number): Entity | undefined {
        return this.entityManager.getEntity(playerID);
    }

    /**
     * Finds an entity at the specified grid position
     * @param qr - Position to check
     * @returns Entity if found at position, undefined otherwise
     */
    public getEntityAtPosition(qr: Vector2): Entity | undefined {
        return this.entityManager.findEntityAtPosition(qr);
    }
    //#endregion

    //#region State Management
    /**
     * Returns the complete current game state
     * @returns Current state object with grid, teams and CRE info
     */
    public getInfo(): StateState {
        return {
            cre: this.creID,
            grid: this.gridManager.getGridState(),
            teams: this.teamManager.getTeamState(),
        };
    }

    /**
     * Synchronizes this state with another partial state
     * @param other - Partial state to merge into current state
     */
    public sync(other: Partial<StateState>): void {
        // Update grid
        if (other.grid) {
            this.gridManager.updateGrid(other.grid);
        }

        // Update teams
        if (other.teams) {
            this.teamManager.updateTeams(other.teams);
        }

        // Update CRE
        if (other.cre) {
            this.creID = other.cre;
        }
    }

    /**
     * Returns the state of a specific entity
     * @param id - Entity ID
     * @returns Read-only state of the entity
     * @throws If entity is not found
     */
    public getEntityState(id: number): ReadonlyEntityState {
        const entity = this.entityManager.getEntity(id);
        if (!entity) {
            throw `[GameState] Entity with id ${id} not found`;
        }
        return entity.state();
    }

    /**
     * Returns the current grid state
     * @returns Read-only grid state
     */
    public getGridState(): ReadonlyGridState {
        return this.gridManager.getGridState();
    }
    //#endregion

    //#region Action System
    /**
     * Commits a battle action to the state
     * @param action - Action to commit
     * @returns Clash result if any occurs
     */
    public commit(action: BattleAction): ClashResult | void {
        switch (action.type) {
            case "attack":
                // Will be handled by CombatSystem
                return;
            case "move":
                this.move(action as MoveAction);
                return;
            default:
                warn(`[GameState] Unknown action type: ${action.type}`);
                return;
        }
    }

    /**
     * Processes a move action
     * @param moveAction - Move action to process
     */
    public move(moveAction: MoveAction): void {
        const { from, to } = moveAction;
        const fromCell = this.gridManager.getCell(from);
        const toCell = this.gridManager.getCell(to);

        if (!fromCell || !toCell) {
            warn("[GameState] Move failed: Invalid cell coordinates");
            return;
        }

        const fromEntityID = fromCell.entity;
        if (!fromEntityID) {
            warn("[GameState] Move failed: No entity at source position");
            return;
        }

        if (toCell.entity) {
            warn("[GameState] Move failed: Destination cell is occupied");
            return;
        }

        const entity = this.getEntity(fromEntityID);
        if (!entity) {
            warn("[GameState] Move failed: Entity not found in manager");
            return;
        }

        const distance = this.gridManager.findDistance(from, to);
        const costOfMovement = distance * MOVEMENT_COST;

        fromCell.entity = undefined;
        entity.set('pos', entity.get('pos') - costOfMovement);
        this.setCell(entity, toCell);
    }
    //#endregion

    //#region Current Relevant Entity (CRE) Management
    /**
     * Returns the position of the current relevant entity
     * @returns Position of the CRE or undefined if not set
     */
    public getCREPosition(): Vector2 | undefined {
        if (!this.creID) {
            return undefined;
        }
        const cre = this.getEntity(this.creID);
        return cre?.qr;
    }

    /**
     * Returns the current relevant entity
     * @returns CRE entity or undefined if not set
     */
    public getCRE(): Entity | undefined {
        if (!this.creID) {
            return undefined;
        }
        return this.getEntity(this.creID);
    }

    /**
     * Sets the current relevant entity
     * @param id - ID of the entity to set as CRE
     */
    public setCRE(id: number): void {
        this.creID = id;
    }
    //#endregion
}
