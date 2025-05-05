import { BattleAction, ClashResult, MoveAction, Reality, StateConfig, StateState, TeamMap } from "shared/class/battle/types";
import { MOVEMENT_COST } from "shared/const";
import { calculateRealityValue, createDummyEntityStats, requestData } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../Events/EventBus";
import Entity from "./Entity";
import { EntityInit, EntityStats, ReadonlyEntityState } from "./Entity/types";
import HexCell from "./Hex/Cell";
import { ReadonlyGridState } from "./Hex/types";
import { EntityManager } from "./Managers/EntityManager";
import { GridManager } from "./Managers/GridManager";
import { TeamManager } from "./Managers/TeamManager";

/**
 * Main game state controller that manages entities, grid, and teams
 * Handles all state transitions and game actions
 */

export interface EntityMovedEventData {
    entityId: number;
    from: Vector2;
    to: Vector2;
}

export class GameState {
    protected logger = Logger.createContextLogger("GameState");
    private eventBus: EventBus;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    private teamManager: TeamManager;
    private creID: number | undefined;
    // private combatSystem: CombatSystem;

    public constructor(config: StateConfig) {
        this.eventBus = new EventBus();
        this.gridManager = new GridManager(config, this.eventBus);
        const entitiesInit: EntityInit[] = this.getEntitiesInitFromTeamMap(config.teamMap);
        this.entityManager = new EntityManager(entitiesInit, this.gridManager, this.eventBus); // Pass eventBus to EntityManager
        this.teamManager = new TeamManager(this.entityManager.getTeamMap());
        this.initialiseTestingDummies();
    }

    //#region Initialisation
    private getEntityNumbers(qr: Vector2, player: Player, teamName: string, characterStats: EntityStats) {
        return {
            playerID: player.UserId,
            stats: characterStats,
            pos: calculateRealityValue(Reality.Maneuver, characterStats),
            org: calculateRealityValue(Reality.Bravery, characterStats),
            hip: calculateRealityValue(Reality.HP, characterStats),
            sta: calculateRealityValue(Reality.HP, characterStats),
            mana: calculateRealityValue(Reality.Mana, characterStats),
            name: player.Name,
            team: teamName,
            qr,
        }
    }

    private initialiseTestingDummies() {
        const vacant = this.gridManager.getAllCells().find((cell) => cell.isVacant());
        assert(vacant, "No vacant cell found for dummy entity");
        const dummy = this.createEntity("Test", createDummyEntityStats(vacant.qr()));
        this.teamManager.addEntityToTeam("Test", dummy);
        this.setCell(dummy, vacant);
    }

    private getEntitiesInitFromTeamMap(teamMap: TeamMap): EntityInit[] {
        const entitiesInit: EntityInit[] = [];
        const vacantCells = this.gridManager.getAllCells().filter(cell => cell.isVacant());
        for (const [teamName, playerList] of pairs(teamMap)) {
            for (const player of playerList) {
                // const characterID = player.Character ? player.Character.Name : "default_character";
                const characterID = 'entity_adalbrecht'; // TODO: temp
                const characterStats = requestData(player, "characterStats", characterID) as EntityStats;

                const i = math.random(0, vacantCells.size() - 1)
                const randomCell = vacantCells[i];
                vacantCells.remove(i)

                const e = this.getEntityNumbers(randomCell.qr(), player, teamName, characterStats);
                entitiesInit.push(e);
            }
        }

        return entitiesInit;
    }
    //#endregion

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

    public getEventBus(): EventBus {
        return this.eventBus;
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
        const addSuccess = this.teamManager.addEntityToTeam(team, entity);
        if (!addSuccess) {
            this.logger.warn(`Failed to add entity to team ${team}`);
        }
        this.setCell(entity, entityInit.qr);

        return entity;
    }

    public getAllPlayers(): Player[] {
        const players = this.teamManager.getAllTeams().map(team => team.players());
        return players.reduce((acc, set) => {
            for (const player of set) {
                acc.push(player);
            }
            return acc;
        }, [] as Player[]);
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
            this.logger.warn(`Cell not found for entity ${entity.playerID}`);
            return;
        }

        const previousPosition = entity.qr || new Vector2(0, 0);
        entity.setCell(cell.qr());
        cell.pairWith(entity);

        // Emit event for entity movement and grid cell update
        if (entity.qr && previousPosition === entity.qr) {
            // Emit entity moved event
            this.eventBus.emit(GameEvent.ENTITY_MOVED, {
                entityId: entity.playerID,
                from: previousPosition,
                to: entity.qr
            } as EntityMovedEventData);

            // Emit grid cell updated event for both cells
            this.eventBus.emit(GameEvent.GRID_CELL_UPDATED, {
                newPosition: entity.qr,
                previousPosition
            });

            // Also emit a general grid update
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.gridManager.getGridState());
        }
    }

    public getCell(qr: Vector2): HexCell | undefined {
        return this.gridManager.getCell(qr);
    }


    public getEntity(qr: Vector2): Entity | undefined
    public getEntity(id: number): Entity | undefined;
    public getEntity(id: number | Vector2, playerID?: number): Entity | undefined {
        if (typeIs(id, "number")) {
            return this.entityManager.getEntity(id);
        } else if (typeIs(id, "Vector2")) {
            return this.entityManager.getEntityAtPosition(id);
        } else {
            this.logger.warn("Invalid ID type");
            return undefined;
        }
    }

    /**
     * Finds an entity at the specified grid position
     * @param qr - Position to check
     * @returns Entity if found at position, undefined otherwise
     */
    public getEntityAtPosition(qr: Vector2): Entity | undefined {
        return this.entityManager.getEntityAtPosition(qr);
    }

    public getDistance(from: Vector2, to: Vector2): number {
        return this.gridManager.findDistance(from, to);
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
            teams: this.teamManager.getTeamStates(),
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
            this.teamManager.updateTeams(other.teams, this.entityManager);
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
                this.logger.warn(`Unknown action type: ${action.type}`);
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
            this.logger.warn("Move failed: Invalid cell coordinates");
            return;
        }

        const fromEntityID = fromCell.entity;
        if (!fromEntityID) {
            this.logger.warn("Move failed: No entity at source position");
            return;
        }

        if (toCell.entity) {
            this.logger.warn("Move failed: Destination cell is occupied");
            return;
        }

        const entity = this.getEntity(fromEntityID);
        if (!entity) {
            this.logger.warn("Move failed: Entity not found in manager");
            return;
        }

        const distance = this.gridManager.findDistance(from, to);
        const costOfMovement = distance * MOVEMENT_COST;

        fromCell.entity = undefined;
        entity.set('pos', entity.get('pos') - costOfMovement);
        this.setCell(entity, toCell);

        // No need to emit here as setCell already does it
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
