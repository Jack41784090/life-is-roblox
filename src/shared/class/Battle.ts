import Roact from "@rbxts/roact";
import Signal from "@rbxts/signal";
import { MOVEMENT_COST } from "shared/const";
import { requestData } from "shared/func";
import { ActionType, AttackAction, BattleConfig, BattleStatus, BotType, ClashResult, ClashResultFate, EntityStats, EntityStatus, ReadinessIcon, Reality } from "shared/types/battle-types";
import Ability from "./Ability";
import BattleCamera from "./BattleCamera";
import BattleGUI from "./BattleGui";
import Cell from "./Cell";
import Entity from "./Entity";
import Grid from "./Grid";
import Pathfinding from "./Pathfinding";

export class BattleTeam {
    name: string;
    members: Entity[];
    constructor(name: string, members: Entity[]) {
        this.members = members;
        this.name = name;
    }
    push(...members: Entity[]) {
        for (const member of members) {
            const exist = this.members.find(m => m.stats.id === member.stats.id);
            if (!exist) {
                this.members.push(member);
            }
        }
    }
}

export default class Battle {
    status: BattleStatus = BattleStatus.Inactive;
    bcamera: BattleCamera;
    gui: BattleGUI | undefined;

    // signals
    onAttackClickedScript: RBXScriptConnection | undefined;
    onAttackClickedSignal = new Signal<(ability: Ability) => void>();

    //
    currentRound: {
        entity?: Entity,
        endRoundResolve?: (value: unknown) => void,
    } | undefined;

    // Entity-Related Information
    teams: BattleTeam[] = [];
    totalEnemyCount: number = 0;
    enemyCount: number = 0;
    playerCount: number = 0;

    grid: Grid;
    gridMin: Vector2;
    gridMax: Vector2;

    // Timeslotting
    time: number = -1;

    static Create(config: BattleConfig) {
        const b = new Battle(config.worldCenter, config.size, config.width, config.height, config.camera);

        // Set up the camera
        b.initializeCamera();

        // Set up the grid
        b.initializeGrid();

        // init players and teams
        b.initializeTeams(config.teamMap);

        // set up gui
        b.gui = BattleGUI.Connect(b);

        // Spawn the entities
        b.begin();

        return b;
    }

    private constructor(worldCenter: Vector2, size: number, width: number, height: number, camera: Camera) {
        this.grid = new Grid(new Vector2(width, height), worldCenter, size, "BattleGrid");
        const camera_centerx = worldCenter.X;
        const camera_centery = worldCenter.Y;
        this.gridMin = new Vector2(camera_centerx - (width * size) / 2, camera_centery - (height * size) / 2);
        this.gridMax = new Vector2(camera_centerx + (width * size) / 2, camera_centery + (height * size) / 2);
        this.bcamera = new BattleCamera(camera, worldCenter, this);
    }

    //#region Initialization
    private initializeGrid() {
        this.grid.materialise();
    }

    private initializeCamera() {
        this.bcamera.enterHOI4Mode();
    }

    private initializeTeams(teamMap: Record<string, Player[]>) {
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList.mapFiltered(player => {
                const characterID = 'entity_adalbrecht'; // temp
                // const characterStats = getCharacterStats(characterID);
                const characterStats = requestData(player, 'characterStats', characterID) as EntityStats;
                warn('cs', characterStats);
                if (!characterStats) {
                    warn(`Character [${characterID}] not found for [${player.Name}]`);
                    return;
                }
                const entity = new Entity({
                    playerID: player.UserId + math.random(0, 1000),
                    stats: characterStats,
                    pos: 0,
                    org: 0,
                    hip: 0,
                    name: player.Name,
                    team: teamName,
                    botType: player.UserId === 0 ? BotType.Enemy : undefined,
                    battle: this,
                });
                return entity;
            });
            this.teams.push(new BattleTeam(teamName, members));
        }
    }
    //#endregion


    createPathForCurrentEntity(dest: Vector2) {
        const entity = this.currentRound?.entity;
        if (!entity) return;
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        const path = Pathfinding.Start({
            grid: this.grid,
            start: entity.cell?.xy ?? new Vector2(0, 0),
            dest: dest,
            limit: lim,
        }).fullPath;
        return path;
    }

    getAllEntities() {
        return this.teams.map(team => team.members).reduce<Entity[]>((acc, val) => [...acc, ...val], []);
    }

    private spawn() {
        const allEntities = this.getAllEntities();
        for (const entity of allEntities) {
            let randomCell: Cell = this.grid.cells[math.random(0, this.grid.cells.size() - 1)];
            let loopBreaker = 0;
            while (randomCell.isVacant() === false) {
                randomCell = this.grid.cells[math.random(0, this.grid.cells.size() - 1)];
                if (loopBreaker++ > 1000) {
                    warn("Loop breaker triggered");
                    break;
                }
            }
            if (!entity.cell && randomCell.isVacant()) {
                entity.setCell(randomCell);
                print(`Spawning ${entity.name} at ${randomCell.xy.X}, ${randomCell.xy.Y}`)
            }
            else {
                warn(`Entity ${entity.name} has no cell or cell is not vacant`);
            }
        }

        allEntities.forEach(e => e.initialiseCharacteristics());
    }

    public begin() {
        print('【Begin】')
        if (this.time === -1) {
            this.spawn();
            this.round();
        };
    }

    private advanceTime() {
        print(`【Time】 ${this.time + 1}`)
        return this.time++;
    }

    private async round() {
        const time = this.advanceTime();
        this.status = BattleStatus.Begin;

        // Run the readiness gauntlet and get the next model to act
        const w = await this.runReadinessGauntlet();
        if (!w) {
            this.resetCameraAndRestartRound();
            return;
        }

        this.currentRound = {
            entity: w,
            endRoundResolve: () => { },
        };

        // Focus the camera on the model
        await this.bcamera.enterCharacterCenterMode();

        // Handle the current round's actions
        const chosenActions = await this.waitForRoundActions(w);

        // Update readiness and finalize the round
        if (w) {
            w.pos /= 2;
        }

        this.finalizeRound();
        this.round(); // Start the next round
    }

    private async resetCameraAndRestartRound() {
        await this.bcamera.enterHOI4Mode();
        this.round(); // Restart the round
    }

    private async waitForRoundActions(w: Entity) {
        return new Promise((resolve) => {
            (this.currentRound ?? (this.currentRound = {})).endRoundResolve = resolve;
            this.gui?.mountActionMenu(this.getActions(w));
            w.playAudio(EntityStatus.Idle);
        });
    }

    getActions(e: Entity) {
        return [
            {
                type: ActionType.Move,
                run: (tree: Roact.Tree) => {
                    Roact.unmount(tree);
                    this.bcamera.enterHOI4Mode().then(() => {
                        this.gui?.enterMovement();
                    })
                },
            },
        ];
    }

    async moveEntity(entity: Entity, cell: Cell, _path?: Vector2[]) {
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        const path = _path ?? Pathfinding.Start({
            grid: this.grid,
            start: entity.cell?.xy ?? new Vector2(0, 0),
            dest: cell.xy,
            limit: lim,
        }).fullPath;
        if (path.size() === 0) {
            warn(`No path found from ${entity.cell?.xy.X}, ${entity.cell?.xy.Y} to ${cell.xy.X}, ${cell.xy.Y}`);
            return;
        }

        const adjacentCell = this.grid.getCell(path[path.size() - 1]);
        let destination: Cell = cell;
        if (cell.isVacant() === false) {
            warn(`Cell ${cell.xy.X}, ${cell.xy.Y} is not vacant`);
            if (adjacentCell.isVacant()) {
                destination = adjacentCell;
            }
            else {
                warn(`Adjacent cell ${adjacentCell.xy.X}, ${adjacentCell.xy.Y} is not vacant`);
                return;
            }
        }

        this.gui?.mountOrUpdateGlowPath(path);
        return entity.moveToCell(destination, path)
    }

    private finalizeRound() {
        this.currentRound = undefined;
        print('【Round Finish】');
        wait(1);
    }

    getEntityFromModel(model: Model) {
        return this.getAllEntities().find(e => e.model === model);
    }

    //#region Calculations
    getReality(reality: Reality, entity: Entity) {
        switch (reality) {
            case Reality.Maneuver:
                return entity.stats.spd * entity.stats.acr;
            default: return 0;
        }
    }
    //#endregion

    //#region Ability Management
    /**
     * Set up the signal for when an attack is clicked
     * Only one script can be set up at a time
     */
    setUpOnAttackClickedSignal(): RBXScriptConnection {
        this.onAttackClickedScript?.Disconnect();
        this.onAttackClickedScript = this.onAttackClickedSignal.Connect((ability: Ability) => {
            if (!ability.target.cell?.xy) {
                warn("Target cell not found");
                return;
            }

            const attackAction: AttackAction = {
                type: ActionType.Attack,
                executed: false,
                ability: ability,
                coordinate: ability.target.cell?.xy,
            }
            const cr = this.clash(attackAction);
            print(cr);
            this.playAttackAnimation(attackAction);
        });
        return this.onAttackClickedScript;
    }

    async playAttackAnimation(_aA: AttackAction) {
        const attacker = _aA.ability.using;
        const target = _aA.ability.target;
        const attackerPrimaryPart = attacker.model?.PrimaryPart;
        const targetPrimaryPart = target.model?.PrimaryPart;
        const animation = _aA.ability.animation;
        if (!attackerPrimaryPart) {
            warn("While playing attack animation, Primary Part not found");
            return;
        }
        if (!targetPrimaryPart) {
            warn("While playing attack animation, Primary Part not found");
            return;
        }

        // remove all gui
        this.gui?.exitMovement();

        // target faces attacker
        await target.faceEntity(attacker);

        // Play the animation
        const attackerAnimationTrack = attacker.playAnimation({ animation, priority: Enum.AnimationPriority.Action4, loop: false });
        // const playCameraAnimationProm = this.bcamera.playAnimation({ animation, center: attackerPrimaryPart.CFrame });
        const targetInitAnimationTrack = target.playAnimation({ animation: 'defend', priority: Enum.AnimationPriority.Action2, loop: false });
        let targetAnimationTrack: AnimationTrack | undefined;

        const t = attackerAnimationTrack?.GetMarkerReachedSignal("Hit").Connect(() => {
            targetAnimationTrack = target.playAnimation({ animation: 'defend-hit', priority: Enum.AnimationPriority.Action3, loop: false });
        });
        const e = attackerAnimationTrack?.Ended.Connect(() => {
            t?.Disconnect();
            e?.Disconnect();
            const transition = target.playAnimation({ animation: 'defend->idle', priority: Enum.AnimationPriority.Action4, loop: false });
            if (transition) {
                target.animationHandler?.idleAnimationTrack?.Stop();
                targetInitAnimationTrack?.Stop();
                targetAnimationTrack?.Stop();
                transition.Stopped.Wait();
            }
            this.applyClash(_aA, this.clash(_aA));
        });

        // wait for animations to finish
        if (targetInitAnimationTrack?.IsPlaying === true) targetInitAnimationTrack?.Ended.Wait();
        if (attackerAnimationTrack?.IsPlaying === true) attackerAnimationTrack?.Ended.Wait();
        if (targetAnimationTrack?.IsPlaying === true) targetAnimationTrack?.Ended.Wait();
        // const cb = await playCameraAnimationProm;
        // const cameraMovementAnimPromise = cb?.playPromise;
        // const cameraMovementReturnCB = cb?.doneCallback;
        // await cameraMovementAnimPromise;
        // wait(.5);
        // cameraMovementReturnCB?.();

        // Play the sound
        attacker.playAudio(EntityStatus.Idle);

        // go back to movement
        this.gui?.enterMovement();
    }

    applyClash(_aA: AttackAction, _cR: ClashResult): void {
        const attacker = _aA.ability.using;
        const target = _aA.ability.target;
        let { damage } = _cR;

        // apply damage
        target.hip -= damage;
    }

    clash(_aA: AttackAction): ClashResult {
        const ability = _aA.ability;
        const attacker = _aA.ability.using;
        const target = _aA.ability.target;

        print(`【Clash】 ${attacker.name} attacking ${target.name} with ${ability.name}`);

        let fate: ClashResultFate = 'Miss';
        let damage: number = 0, u_damage: number = 0;

        const hit = math.random(1, 100);
        const hitChance = ability.acc - this.getReality(Reality.Maneuver, target);
        const crit = this.getReality(Reality.Precision, attacker);

        const abilitydamage = ability.calculateDamage();
        const minDamage = abilitydamage * 0.5;
        const maxDamage = ability.calculateDamage();
        const prot = 0

        // see if it crits
        if (hit <= hitChance) {
            // crit
            if (hit <= hitChance * 0.1 + crit) {
                u_damage = (math.random((minDamage + maxDamage) / 2, maxDamage)) * 2;
                fate = "CRIT";
            }
            // hit
            else {
                u_damage = math.random(minDamage, maxDamage);
                fate = "Hit";
            }
        }

        u_damage = math.clamp(u_damage, 0, 1000);

        // apply protections
        damage = math.clamp(u_damage * (1 - prot), 0, 100);

        const cR: ClashResult = {
            damage: damage,
            u_damage: u_damage,
            fate: fate,
            roll: hit,
        }; print(cR);

        return cR;
    }

    //#endregion

    //#region Readiness Management
    static readonly MOVEMENT_COST = 10;

    getReadinessIcons(): ReadinessIcon[] {
        const characterIcons: ReadinessIcon[] = [];
        for (const e of this.getAllEntities()) {
            characterIcons.push({
                iconID: e.playerID,
                iconUrl: "rbxassetid://18915919565",
                readiness: e.pos / 100
            });
        }
        return characterIcons;
    }
    calculateReadinessIncrement(entity: Entity) {
        // const y = entity.stats.spd;
        const y = math.random(0, 10);
        const r = - math.random() * 0.1 * y + math.random() * 0.1 * y;
        return y + r;
    }
    runReadinessGauntlet() {
        print('【Run Readiness Gauntlet】');
        const entities = this.teams.map(team => team.members).reduce<Entity[]>(
            (acc, val) => [...acc, ...val], []);

        if (entities.size() === 0) return;

        let i = 0
        while (entities.sort((a, b) => a.pos - b.pos > 0)[0].pos < 100) {
            this._gauntletIterate(entities);
            i++;
            if (i++ > 10000) break;
        }

        const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
        return this.gui?.tweenToUpdateReadiness()?.then(() => winner);
    }
    private _gauntletIterate(entities: Entity[]) {
        for (const entity of entities) {
            entity.pos += this.calculateReadinessIncrement(entity);
            if (entity.pos >= 100) {
                entity.pos = 100;
                // this.onEntityReady(entity);
            }
        }
    }
    //#endregion
}
