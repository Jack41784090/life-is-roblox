import { atom } from "@rbxts/charm";
import { t } from "@rbxts/t";
import { ActionType, AttackAction, BattleAction, ClashResult, MoveAction, Reality, ResolveAttacksAction, StateConfig, StateState, TeamMap } from "shared/class/battle/types";
import { MOVEMENT_COST } from "shared/const";
import { calculateRealityValue, createDummyEntityStats, requestData } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../Events/EventBus";
import CombatSystem from "../Systems/CombatSystem";
import { TurnSystem } from "../Systems/TurnSystem";
import Entity from "./Entity";
import { EntityConfig, EntityState, EntityStats, EntityUpdate, ReadonlyEntityState } from "./Entity/types";
import HexCell from "./Hex/Cell";
import { ReadonlyGridState } from "./Hex/types";
import { EntityManager } from "./Managers/EntityManager";
import { GridManager } from "./Managers/GridManager";
import { TeamManager } from "./Managers/TeamManager";
import Team from "./Team";

/**
 * Main game state controller that manages entities, grid, and teams
 * Handles all state transitions and game actions
 */

export interface EntityMovedEventData {
    entityId: number;
    from: Vector2;
    to: Vector2;
}

export default class State {
    protected logger = Logger.createContextLogger("State");
    private eventBus: EventBus;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    private teamManager: TeamManager;
    private combatSystem: CombatSystem;
    private turnSystem: TurnSystem;

    public constructor(config: StateConfig) {
        this.eventBus = new EventBus();
        this.gridManager = new GridManager(config, this.eventBus);
        const entitiesInit: EntityConfig[] = this.getEntitiesInitFromTeamMap(config.teamMap);
        this.entityManager = new EntityManager(entitiesInit, this.gridManager, this.eventBus); // Pass eventBus to EntityManager
        this.teamManager = new TeamManager(this.entityManager.getTeamMap());
        this.combatSystem = new CombatSystem(this);
        this.turnSystem = new TurnSystem({
            gauntletTickInterval: 0.2,
            readinessAtoms: atom(this.entityManager.getAllEntities().map((entity) => {
                return atom({
                    id: entity.playerID,
                    pos: entity.getState('pos'),
                    spd: atom(entity.stats.spd), // TODO: speed should be affected by buffs and debuffs so spd stat should be an atom
                })
            }))
        });
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

    private getEntitiesInitFromTeamMap(teamMap: TeamMap): EntityConfig[] {
        const entitiesInit: EntityConfig[] = [];
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

    //#region Combat System
    public getCombatSystem(): CombatSystem {
        return this.combatSystem;
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
    public getAttackerAndDefender(action: AttackAction): [Entity?, Entity?] {
        return [this.entityManager.getEntity(action.by), action.against ? this.entityManager.getEntity(action.against) : undefined];
    }

    getCurrentActor(): Entity {
        const currentActorID = this.turnSystem.getCurrentActorID();
        const entity = this.entityManager.getEntity(currentActorID);
        if (!entity) {
            throw `Entity with ID ${currentActorID} not found`;
        }
        return entity;
    }
    getCurrentActorID(): number | Promise<number> {
        return this.turnSystem.getCurrentActorID();
    }
    getCurrentActorPlayer(): Player | undefined {
        const currentActorID = this.turnSystem.getCurrentActorID();
        const entity = this.entityManager.getEntity(currentActorID);
        if (!entity) {
            throw `Entity with ID ${currentActorID} not found`;
        }
        return this.getAllPlayers().find((p) => p.UserId === entity.playerID);
    }
    /**
     * Creates a new entity and adds it to the specified team
     * @param team - Team identifier
     * @param entityInit - Entity initialization data
     * @returns Newly created entity
     */
    public createEntity(team: string, entityInit: EntityConfig): Entity {
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

    public getReadinessMapping() {
        const readinessAtoms = this.turnSystem.getReadinessMap();
        return readinessAtoms;
    }

    public getReadinessFragments() {
        const readinessAtoms = this.turnSystem.getReadinessFragments();
        return readinessAtoms;
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
            this.eventBus.emit(GameEvent.ENTITY_UPDATED, {
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
    public getState(): StateState {
        return {
            grid: this.gridManager.getGridState(),
            teams: this.teamManager.getTeamStates(),
        };
    }

    /**
     * Synchronizes this state with another partial state
     * @param other - Partial state to merge into current state
     */
    public sync(other: Partial<StateState> & { entities?: EntityUpdate[] }): void {
        // Update grid
        if (other.grid) {
            this.gridManager.updateGrid(other.grid);
        }

        // Update teams
        if (other.teams) {
            this.teamManager.updateTeams(other.teams, this.entityManager);
            const members: EntityState[] = [];
            for (const team of other.teams) {
                team.members.forEach(_ => members.push(_));
            }
            this.turnSystem.sync({
                listOfReadinessState: members.mapFiltered(m => {
                    const entity = this.entityManager.getEntity(m.playerID);
                    if (!entity) {
                        this.logger.warn(`Entity with ID ${m.playerID} not found`);
                        return;
                    }
                    return {
                        id: m.playerID,
                        pos: entity.getState('pos'),
                        spd: atom(entity.stats.spd),
                    }
                })
            })
        }

        if (other.entities) {
            for (const entityUpdate of other.entities) {
                const currentEntity = this.entityManager.getEntity(entityUpdate.playerID);
                if (currentEntity) {
                    this.entityManager.updateEntity(entityUpdate);
                    if (entityUpdate.team && currentEntity.team !== entityUpdate.team) {
                        this.teamManager.addEntityToTeam(entityUpdate.team, currentEntity, true);
                    }
                } else {
                    this.logger.warn(`Entity with ID ${entityUpdate.playerID} not found`);
                }
            }
            this.turnSystem.sync({
                listOfReadinessState: other.entities.mapFiltered(m => {
                    const entity = this.entityManager.getEntity(m.playerID);
                    if (!entity) {
                        this.logger.warn(`Entity with ID ${m.playerID} not found`);
                        return;
                    }
                    return {
                        id: m.playerID,
                        pos: entity.getState('pos'),
                        spd: atom(entity.stats.spd),
                    }
                })
            })
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
            throw `[State] Entity with id ${id} not found`;
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
        this.logger.info(`Committing action: ${action.type}`, action);
        switch (action.type) {
            case ActionType.ResolveAttacks:
                const clashes = (action as ResolveAttacksAction).results;
                if (!clashes) {
                    this.logger.warn("No clashes found in committed action");
                    return;
                }
                const [attacker, target] = this.getAttackerAndDefender(action as AttackAction);
                if (!attacker || !target) {
                    this.logger.warn("Attacker or target not found in committed action");
                    return;
                }
                this.combatSystem.applyAttack(clashes, attacker, target);
                return;
            case ActionType.Attack:
                this.rollAndApply({
                    ...action,
                } as AttackAction);
                return;
            case ActionType.Move:
                this.move(action as MoveAction);
                return;
            default:
                this.logger.warn(`Unknown action type: ${action.type}`);
                return;
        }
    }

    public rollAndApply(action: AttackAction): void {
        const cs = this.combatSystem;
        const clashes = cs.resolveAttack(action);

        // Emit the combat started event with the clash results
        if (clashes.size() < 1) {
            this.logger.warn("No clashes found for the attack action");
            return;
        }

        this.logger.info(`Combat started with ${clashes.size()} clash results`);
        if (action.against !== undefined) {
            const attacker = this.getEntity(action.by);
            const target = this.getEntity(action.against);

            if (attacker && target) {
                cs.applyAttack(clashes, attacker, target);
            } else {
                this.logger.warn("Cannot apply attack: attacker or target not found");
            }
        }
    }

    /**
     * Processes a move action
     * @param moveAction - Move action to process
     */
    public move(moveAction: MoveAction): void {
        const { from, to } = moveAction;

        // Skip if source and destination are the same
        if (from.X === to.X && from.Y === to.Y) {
            this.logger.info(`Move skipped: Source and destination are the same (${from})`);
            return;
        }

        const fromCell = this.gridManager.getCell(from);
        const toCell = this.gridManager.getCell(to);

        if (!fromCell || !toCell) {
            this.logger.warn(`Move failed: Invalid cell coordinates - from ${from} to ${to}`);
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

    //#region Gameplay Loop

    private async waitForResponse(winningClient: Player): Promise<Player | undefined> {
        const eventBus = this.getEventBus();
        return await new Promise<Player | undefined>((resolve) => {
            const cleanup = eventBus.subscribe(GameEvent.TURN_ENDED, (id: unknown) => {
                const verification = t.number(id);
                if (!verification || (id !== winningClient.UserId && id !== -4178)) {
                    this.logger.warn(`Invalid ID`, id as defined);
                    return;
                }
                cleanup();
                resolve(id === -4178 ? undefined : winningClient);
            });
        }).then((p) => {
            return p;
        });
    }

    private checkGameOver(): boolean {
        const teamManager = this.getTeamManager();
        const teams = teamManager.getAllTeams();
        let activeTeamsCount = 0;

        for (const team of teams) {
            const hasAliveMembers = team.members.some((member: Entity) => {
                return member.get('hip') > 0;
            });

            if (hasAliveMembers) {
                activeTeamsCount++;
            }
        }

        // if (activeTeamsCount <= 1) {

        //     return true;
        // }
        return false;
    }

    private handleGameOver() {
        this.logger.info("Game over sequence initiated.");
        const teamManager = this.getTeamManager();
        const teams = teamManager.getAllTeams();
        const activeTeams: Team[] = [];

        for (const team of teams) {
            const hasAliveMembers = team.members.some((member: Entity) => {
                return member.get('pos') > 0;
            });
            if (hasAliveMembers) {
                activeTeams.push(team);
            }
        }

        let winner: Team | undefined = undefined;
        if (activeTeams.size() === 1) {
            winner = activeTeams[0];
        }
    }

    private async round() {
        // 1. Getting the next actor
        const pnt = await this.turnSystem.determineNextActorByGauntletGradual();
        if (!pnt) {
            this.logger.warn("No next actor could be determined by TurnSystem.");
            if (!this.checkGameOver()) {
                this.logger.error("Battle loop cannot continue: No next actor, but game over conditions not met.");
                throw "Battle loop cannot continue: No next actor, but game over conditions not met.";
            }
            return;
        }

        // 1.5 - Validating the next actor
        const [currentActor, actingEntity] = (() => {
            const entity = this.entityManager.getEntity(pnt.id);
            const player = this.getAllPlayers().find((p) => p.UserId === entity?.playerID);
            return [player, entity]
        })();
        if (!currentActor || !actingEntity) {
            this.logger.error("No current actor or acting entity found.");
            throw "No current actor or acting entity found." + `currentActor: ${!!currentActor}; actingEntity: ${!!actingEntity}`;
        }

        // 2. Turn start; Waiting for response
        this.eventBus.emit(GameEvent.TURN_STARTED, currentActor.UserId);
        this.logger.info(`New turn starting for: ${currentActor.Name} (Entity: ${actingEntity.name})`);
        const playerEndingTurn = await this.waitForResponse(currentActor);
        if (playerEndingTurn) {
            this.logger.info(`Turn action phase concluded by ${playerEndingTurn.Name}.`);
        } else {
            this.logger.warn(`Turn action phase for ${currentActor.Name} concluded without a specific player action.`);
        }
    }

    public async StartLoop() {
        this.logger.info("Starting new round...");
        try {
            await this.round();
        } catch (err) {
            this.logger.error(`Error during round: ${err}`);
        }

        if (this.checkGameOver()) {
            this.logger.info("Game loop finished.");
            this.handleGameOver();
        }
        else {
            this.logger.info("Game loop continues.");
            task.delay(1, () => {
                this.StartLoop();
            });
        }
    }

    //#endregion
}
