import { t } from "@rbxts/t";
import { MOVEMENT_COST } from "shared/const";
import { ActionType, AttackAction, BattleAction, ClashResult, ClashResultFate, HexGridState, MoveAction, PlayerID, Reality, StateConfig, StateState, TILE_SIZE, TeamState } from "shared/types/battle-types";
import { calculateRealityValue, getDummyNumbers, requestData } from "shared/utils";
import { ActiveAbility } from "./Ability";
import { ActiveAbilityState } from "./Ability/types";
import Entity from "./Entity";
import { EntityInit, EntityState, EntityStats, EntityUpdate } from "./Entity/types";
import HexCell from "./Hex/Cell";
import HexGrid from "./Hex/Grid";
import Team from "./Team";

type PositionEntityTuple = {
    qr: Vector2;
    entity: Entity;
}

export default class State {
    creID: number | undefined;
    private participantMap: Map<number, PositionEntityTuple> = new Map();
    private teams: Team[] = [];
    grid: HexGrid;

    constructor({ width, worldCenter, teamMap }: StateConfig) {
        this.grid = new HexGrid({
            radius: math.floor(width / 2),
            center: new Vector2(worldCenter.X, worldCenter.Z),
            size: TILE_SIZE,
            name: "BattleGrid",
        });
        this.initialiseNumbers(teamMap);
    }

    public createEntity(team: string, e: EntityInit) {
        const entity = new Entity(e);
        const teamObj = this.teams.find(t => t.name === team);
        if (teamObj) {
            teamObj.addMembers(entity);
        } else {
            warn(`Team [${team}] not found`);
        }
        this.participantMap.set(e.playerID, { qr: e.qr, entity });
        this.setCell(entity, e.qr);

        return entity;
    }

    public setCell(entity: Entity, X: number, Y: number): void;
    public setCell(entity: Entity, qr: Vector2): void;
    public setCell(entity: Entity, qr: Vector3): void;
    public setCell(entity: Entity, cell: HexCell): void;
    public setCell(entity: Entity, X: number | Vector2 | Vector3 | HexCell, Y?: number): void {
        let cell: HexCell | undefined;
        if (typeIs(X, "number") && typeIs(Y, "number")) {
            cell = this.grid.getCell(new Vector2(X, Y));
        } else if (typeIs(X, "Vector2")) {
            cell = this.grid.getCell(X);
        } else if (typeIs(X, "Vector3")) {
            cell = this.grid.getCell(new Vector2(X.X, X.Y));
        } else {
            cell = X as HexCell;
        }
        if (!cell) {
            warn(`Cell [${X}, ${Y}] not found`);
            return;
        }

        this.participantMap.set(entity.playerID, { qr: cell.qr(), entity })
        entity.setCell(cell.qr());
        cell.pairWith(entity);
    }

    //#region Syncronisation
    public teamInfo(): TeamState[] {
        return this.teams.map((team) => ({
            name: team.name,
            members: team.members.map((entity) => entity.state()),
        }));
    }

    public gridInfo() {
        return this.grid.info();
    }

    public info(): StateState {
        return {
            cre: this.creID,
            grid: this.gridInfo(),
            teams: this.teamInfo(),
        };
    }

    private syncGrid(grid: HexGridState) {
        this.grid.update(grid);
    }

    private syncTeams(newTeamsStates: TeamState[]) {
        const ourTeams = this.teams;
        for (const newTeamState of newTeamsStates) {
            const existingTeam = ourTeams.find(t => t.name === newTeamState.name);
            if (existingTeam) {
                for (const entity of existingTeam.members) {
                    const updatingEntityState = newTeamState.members.find((e) => e.playerID === entity.playerID);
                    if (updatingEntityState) {
                        this.syncOneEntity(entity, updatingEntityState);
                    }
                }
            }
            else {
                warn(`Team [${newTeamState.name}] not found`);
                const newTeam = new Team(newTeamState.name, newTeamState.members.map(entity => this.createEntity(newTeamState.name, entity)));
                this.teams.push(newTeam);
            }
        }
    }

    public syncOneEntity(e: Entity, updateInfo: EntityUpdate) {
        e.update(updateInfo);
        if (this.participantMap.get(updateInfo.playerID) === undefined) {
            this.participantMap.set(updateInfo.playerID, {
                qr: updateInfo.qr ?? e.qr!,
                entity: e,
            });
        }
    }

    public sync(other: Partial<StateState>) {
        print(`Syncing state with`, other);

        // 1. Update grid
        if (other.grid) this.syncGrid(other.grid);

        // 2. Update teams
        if (other.teams) this.syncTeams(other.teams);

        // 3 Update CRE
        if (other.cre) this.creID = other.cre;

        print(`Synced state`, this);
    }

    public commit(action: BattleAction) {
        print(`Committing action`, action);
        switch (action.type) {
            case ActionType.Attack:
                const aAction = action as AttackAction;
                const clashResult = this.clash(action as AttackAction);
                aAction.clashResult = clashResult;
                return this.applyClash(aAction);
            case ActionType.Move:
                assert(t.interface({
                    from: t.Vector2,
                    to: t.Vector2,
                })(action), "Invalid move action");
                return this.move(action as MoveAction);
            default:
                warn("Invalid action type", action.type);
        }
    }

    public move(moveAction: MoveAction) {
        const { from, to } = moveAction;
        const fromCell = this.grid.getCell(from);
        const toCell = this.grid.getCell(to);
        if (!toCell) {
            warn("No to cell found");
            return;
        }
        const fromEntityID = fromCell?.entity;
        const toEntityID = toCell?.entity;
        if (!fromEntityID) {
            warn("No entity found in from cell");
            return;
        }
        if (toEntityID) {
            warn("Entity already present in to cell");
            return;
        }
        const fromEntity = this.findEntity(fromEntityID);
        if (!fromEntity) {
            warn("Invalid entity ID");
            return;
        }

        const distance = this.findDistance(from, to);
        const costOfMovement = distance * MOVEMENT_COST;
        fromCell.entity = undefined;
        const movingEntity = this.participantMap.get(fromEntityID)?.entity;
        assert(movingEntity, "invalid fromEntityID leads to undefined movingEntity in state.move");
        movingEntity.set('pos', movingEntity.get('pos') - costOfMovement);
        return this.setCell(fromEntity, toCell);
    }

    private tireAttacker(attacker: Entity, ability: ActiveAbilityState) {
        for (const [stat, modifier] of pairs(ability.cost)) {
            attacker.set(stat, attacker.get(stat) - modifier);
        }
    }

    private tireDefender(defender: Entity, ability: ActiveAbilityState) {
        defender.set('pos', defender.get('pos') - ability.cost.pos);
    }

    public applyClash(attackAction: AttackAction) {
        const clashResult = attackAction.clashResult;
        if (!clashResult) {
            warn("applyClash: Clash result not found");
            return;
        }
        print(`Clash Result:`, clashResult);
        attackAction.executed = true;

        const attacker = this.findEntity(attackAction.by); assert(attacker, "Attacker not found");
        const target = attackAction.against ? this.findEntity(attackAction.against) : undefined;


        // 1. Attacker takes a swing, reducing his ability costs
        this.tireAttacker(attacker, attackAction.ability);

        // 2. Defender uses up energy to react
        if (target) this.tireDefender(target, attackAction.ability);

        // 3. Defender reacts to the attack, possibly modifying the forecasted clash result
        const { defendAttemptSuccessful, defendReactionUpdate } = clashResult
        if (target && defendAttemptSuccessful) {
            const { using: attackerUpdate, target: targetUpdate, clashResult: clashResultUpdate } = defendReactionUpdate;
            if (attackerUpdate) this.syncOneEntity(attacker, attackerUpdate);
            if (targetUpdate) this.syncOneEntity(target, targetUpdate);
            if (clashResultUpdate) {
                for (const [stat, value] of pairs(clashResultUpdate)) {
                    (clashResult as unknown as Record<string, unknown>)[stat] = value;
                }
            }
        }

        // 4. Apply the damage to the target
        if (target) {
            target.damage(clashResult.damage);
        }

        return clashResult;
    }

    private roll(acc: number, attacker: EntityState, target: EntityState) {
        const hitRoll = math.random(1, 100);
        const hitChance = acc - calculateRealityValue(Reality.Maneuver, target.stats);
        const critChance = calculateRealityValue(Reality.Precision, attacker.stats);
        return { hitRoll, hitChance, critChance };
    }

    private rebuildAbility(abilityState: ActiveAbilityState, by: PlayerID, against: PlayerID) {
        const allEntities = this.getAllEntities();
        const ability = new ActiveAbility({
            ...abilityState,
            using: allEntities.find(e => e.playerID === by),
            target: allEntities.find(e => e.playerID === against),
        });
        return ability;
    }

    public clash(attackAction: AttackAction): ClashResult {
        print(`Clashing`, attackAction);
        const { using: attacker, target, chance: acc } = attackAction.ability;

        if (!attacker || !target) {
            warn("Attacker or target not found");
            return { damage: 0, u_damage: 0, fate: "Miss", roll: 0, defendAttemptName: "", defendAttemptSuccessful: true, defendReactionUpdate: {} };
        }
        print(`Attacker: ${attacker.name} | Target: ${target.name} | Accuracy: ${acc}`);

        const { hitRoll, hitChance, critChance } = this.roll(acc, attacker, target);

        const ability = this.rebuildAbility(attackAction.ability, attacker.playerID, target.playerID);
        const abilityDamage = ability.calculateDamage();
        const minDamage = abilityDamage * 0.5;
        const maxDamage = abilityDamage;

        let fate: ClashResultFate = "Miss";
        let damage = 0;
        if (hitRoll <= hitChance) {
            if (hitRoll <= hitChance * 0.1 + critChance) {
                damage = math.random((minDamage + maxDamage) / 2, maxDamage) * 2;
                fate = "CRIT";
            } else {
                damage = math.random(minDamage, maxDamage);
                fate = "Hit";
            }
        }
        const clashResult = {
            damage,
            u_damage: damage,
            fate,
            roll: hitRoll
        };

        const reaction = ability.target!.getReaction(ability.getState());
        const reactionUpdate = reaction?.react(ability.getState(), clashResult);

        damage = math.clamp(damage, 0, 1000);
        return {
            ...clashResult,
            defendAttemptSuccessful: reaction?.defendAttemptSuccessful ?? false,
            defendAttemptName: reaction?.name ?? "",
            defendReactionUpdate: reactionUpdate ?? {},
        };
    }

    //#endregion

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

    /**
     * initialises the teams for the battle.
     *
     * @param teamMap - A record where the key is the team name and the value is an array of players belonging to that team.
     *
     * This method iterates over the provided team map, processes each player to create an `Entity` object, and then
     * groups these entities into `Team` objects which are added to the `teams` array.
     *
     * Each player is mapped to an `Entity` object by fetching their character stats and other relevant information.
     * If the character stats are not found, a warning is logged and the player is skipped.
     *
     * @remarks
     * - The `playerID` is generated by adding a random number to the player's `UserId`.
     * - If the player's `UserId` is 0, the entity is marked as an enemy bot.
     * - The `characterID` is currently hardcoded as 'entity_adalbrecht' for temporary purposes.
     */
    protected initialiseTeams(teamMap: Record<string, Player[]>) {
        const vacantCells = this.grid.cells.filter((c) => c.isVacant());
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList
                .mapFiltered((player) => {
                    // const characterID = player.Character ? player.Character.Name : "default_character";
                    const characterID = 'entity_adalbrecht'; // TODO: temp
                    const characterStats = requestData(player, "characterStats", characterID) as EntityStats;

                    const i = math.random(0, vacantCells.size() - 1)
                    const randomCell = vacantCells[i];
                    vacantCells.remove(i)

                    if (!characterStats) {
                        warn(`Character [${characterID}] not found for [${player.Name}]`);
                        return undefined;
                    }


                    const e = this.createEntity(teamName, this.getEntityNumbers(randomCell.qr(), player, teamName, characterStats));
                    e.setCell(randomCell.qr());

                    return e;
                })
            this.teams.push(new Team(teamName, members));
        }
        print("Initialised teams", this.teams);
    }
    /**
     * Initializes various components of the battle state, including the grid, teams, entity positions, and (temporarily) testing dummies.
     *
     * @param teamMap - A record mapping team names to arrays of players.
     */
    public initialiseNumbers(teamMap: Record<string, Player[]>) {
        this.grid.initialise();
        this.initialiseTeams(teamMap);
        this.initialiseTestingDummies(); // temp
    }

    private initialiseTestingDummies() {
        const vacant = this.grid.cells.find((c) => c.isVacant())!;
        const dummy = this.createEntity("Test", getDummyNumbers(vacant.qr()));
        this.teams.push(new Team("Test", [dummy]));
        this.setCell(dummy, vacant);
    }
    //#endregion

    //#region Find Info
    public findEntity(qr: Vector3): Entity | undefined;
    public findEntity(qr: Vector2): Entity | undefined;
    public findEntity(playerID: number): Entity | undefined
    public findEntity(qr: Vector2 | number | Vector3): Entity | undefined {
        // const allEntities = this.getAllEntities();
        let condition: (entity: Entity) => boolean;
        if (typeIs(qr, 'Vector2') || typeIs(qr, 'Vector3')) {
            condition = (entity) => entity.qr !== undefined && entity.qr.X === qr.X && entity.qr.Y === qr.Y;
        } else if (typeIs(qr, 'number')) {
            return this.findEntityByPlayerID(qr);
        }

        for (const t of this.teams) {
            const entity = t.members.find(e => condition(e));
            if (entity) return entity;
        }
    }

    public findEntityByPlayerID(playerID: number): Entity | undefined {
        return this.participantMap.get(playerID)?.entity;
    }

    public findDistance(a: Vector2, b: Vector2): number
    public findDistance(a: HexCell, b: HexCell): number
    public findDistance(a: Vector3, b: Vector3): number
    public findDistance(a: Vector2 | HexCell | Vector3, b: Vector2 | HexCell | Vector3): number {
        return this.grid.findDistance(a as Vector2, b as Vector2);
    }

    public getCell(qr: Vector2): HexCell | undefined {
        return this.grid.getCell(qr);
    }

    public getAllEntities() {
        const entitySet = new Set<Entity>();
        for (const team of this.teams) {
            for (const member of team.members) {
                entitySet.add(member);
            }
        }
        return [...entitySet]
    }

    public getAllPlayers() {
        const playerSet = new Set<Player>();
        for (const team of this.teams) {
            for (const player of team.players()) {
                playerSet.add(player);
            }
        }
        print("Player Set", playerSet);
        return [...playerSet];
    }

    public getCREPosition() {
        if (!this.creID) {
            warn("CRE ID not found");
            return undefined;
        }
        const cre = this.findEntity(this.creID);
        return cre?.qr;
    }

    public getCRE() {
        if (!this.creID) {
            warn("CRE ID not found");
            return undefined;
        }
        return this.findEntity(this.creID);
    }
    //#endregion

    //#region Readiness
    private calculateReadinessIncrement(entity: Entity) {
        return entity.stats.spd + math.random(-0.1, 0.1) * entity.stats.spd;
    }

    private iterateReadinessGauntlet(entities: Entity[]) {
        for (const entity of entities) {
            const readiness = entity.get('pos');
            entity.set('pos', math.clamp(readiness + this.calculateReadinessIncrement(entity), 0, 100));
        }
    }

    public runReadinessGauntlet() {
        const entities = this.getAllEntities();
        if (entities.size() === 0) {
            warn("Entity list is empty");
            return;
        }

        while (!entities.some((e) => e.get('pos') >= 100)) {
            this.iterateReadinessGauntlet(entities);
        }

        const winner = entities.sort((a, b) => a.get('pos') - b.get('pos') > 0)[0];
        return winner;
    }
    //#endregion
}