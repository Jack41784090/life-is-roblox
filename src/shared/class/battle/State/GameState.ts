import { MOVEMENT_COST } from "shared/const";
import { BattleAction, ClashResult, MoveAction, Reality, StateConfig, StateState } from "shared/types/battle-types";
import { calculateRealityValue, getDummyNumbers, requestData } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus } from "../Events/EventBus";
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
export class GameState {
    private logger = Logger.createContextLogger("GameState");
    private eventBus: EventBus;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    private teamManager: TeamManager;
    private creID: number | undefined;

    constructor(config: StateConfig) {
        this.gridManager = new GridManager(config);
        this.eventBus = new EventBus();
        this.entityManager = new EntityManager(this.eventBus); // Pass eventBus to EntityManager
        this.teamManager = new TeamManager(config.teamMap);
        this.initialiseNumbers(config.teamMap);
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

    protected initialiseTeams(teamMap: Record<string, Player[]>) {
        const vacantCells = this.gridManager.getAllCells().filter((cell) => cell.isVacant());
        for (const [teamName, playerList] of pairs(teamMap)) {
            for (const player of playerList) {
                // const characterID = player.Character ? player.Character.Name : "default_character";
                const characterID = 'entity_adalbrecht'; // TODO: temp
                const characterStats = requestData(player, "characterStats", characterID) as EntityStats;

                const i = math.random(0, vacantCells.size() - 1)
                const randomCell = vacantCells[i];
                vacantCells.remove(i)

                if (!characterStats) {
                    this.logger.warn(`Character [${characterID}] not found for [${player.Name}]`);
                    return undefined;
                }

                const e = this.createEntity(teamName, this.getEntityNumbers(randomCell.qr(), player, teamName, characterStats));
                this.setCell(e, randomCell);
                this.teamManager.addEntityToTeam(teamName, e);
            }
        }
        this.logger.info(`Teams initialized: ${this.teamManager.getAllTeams().size()} teams`);
    }

    public initialiseNumbers(teamMap: Record<string, Player[]>) {
        this.initialiseTeams(teamMap);
        this.initialiseTestingDummies(); // temp
    }

    private initialiseTestingDummies() {
        const vacant = this.gridManager.getAllCells().find((cell) => cell.isVacant());
        assert(vacant, "No vacant cell found for dummy entity");
        const dummy = this.createEntity("Test", getDummyNumbers(vacant.qr()));
        this.teamManager.addEntityToTeam("Test", dummy);
        this.setCell(dummy, vacant);
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
            warn(`[GameState] Failed to add entity to team ${team}`);
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
            warn(`[GameState] Cell not found for entity ${entity.playerID}`);
            return;
        }

        const previousPosition = entity.qr || new Vector2(0, 0);
        entity.setCell(cell.qr());
        cell.pairWith(entity);
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
            return this.entityManager.findEntityAtPosition(id);
        } else {
            warn("[GameState] Invalid ID type");
            return undefined;
        }
    }

    /**
     * Finds an entity at the specified grid position
     * @param qr - Position to check
     * @returns Entity if found at position, undefined otherwise
     */
    public getEntityAtPosition(qr: Vector2): Entity | undefined {
        return this.entityManager.findEntityAtPosition(qr);
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
