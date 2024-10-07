import Roact from "@rbxts/roact";
import Signal from "@rbxts/signal";
import { MOVEMENT_COST } from "shared/const";
import {
    AttackAction,
    BattleConfig,
    BattleStatus,
    BotType,
    CharacterActionMenuAction,
    CharacterMenuAction,
    ClashResult,
    ClashResultFate,
    EntityStats,
    EntityStatus,
    ReadinessIcon,
    Reality,
} from "shared/types/battle-types";
import { requestData } from "shared/utils";
import Ability from "./Ability";
import BattleCamera from "./BattleCamera";
import BattleGUI from "./BattleGui";
import Entity from "./Entity";
import HexCell from "./HexCell";
import HexGrid from "./HexGrid";
import Pathfinding from "./Pathfinding";

export class BattleTeam {
    name: string;
    members: Entity[];

    constructor(name: string, members: Entity[]) {
        this.name = name;
        this.members = members;
    }

    push(...members: Entity[]) {
        for (const member of members) {
            if (!this.members.some((m) => m.stats.id === member.stats.id)) {
                this.members.push(member);
            }
        }
    }
}

export default class Battle {
    status: BattleStatus = BattleStatus.Inactive;
    bcamera: BattleCamera;
    gui?: BattleGUI;
    onAttackClickedScript?: RBXScriptConnection;
    onAttackClickedSignal = new Signal<(ability: Ability) => void>();
    currentRound?: Entity;
    teams: BattleTeam[] = [];
    grid: HexGrid;
    gridMin: Vector2;
    gridMax: Vector2;
    time = -1;

    //#region Initialization

    static Create(config: BattleConfig) {
        const battle = new Battle(config.worldCenter, config.size, config.width, config.height, config.camera);
        battle.initializeCamera();
        battle.initializeGrid();
        battle.initializeTeams(config.teamMap);
        battle.gui = BattleGUI.Connect(battle);
        battle.startBattle();
        return battle;
    }

    private constructor(worldCenter: Vector3, size: number, width: number, height: number, camera: Camera) {
        this.grid = new HexGrid({
            radius: math.floor(width / 2),
            center: new Vector2(worldCenter.X, worldCenter.Z),
            size: size,
            name: "BattleGrid",
        });
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        this.gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        this.gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);
        this.bcamera = new BattleCamera(camera, worldCenter, this);
    }

    private initializeGrid() {
        this.grid.materialise();
    }

    private initializeCamera() {
        this.bcamera.enterHOI4Mode();
    }

    private initializeTeams(teamMap: Record<string, Player[]>) {
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList
                .mapFiltered((player) => {
                    const characterID = player.Character ? player.Character.Name : "default_character";
                    const characterStats = requestData(player, "characterStats", characterID) as EntityStats;
                    if (!characterStats) {
                        warn(`Character [${characterID}] not found for [${player.Name}]`);
                        return undefined;
                    }
                    return new Entity({
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
                })
                .filter((entity): entity is Entity => entity !== undefined);
            this.teams.push(new BattleTeam(teamName, members));
        }
    }

    //#endregion

    //#region Entity Management

    createPathfinderForCurrentEntity(dest: Vector2) {
        const entity = this.currentRound;
        if (!entity || !entity.cell) {
            warn("Current entity not found or has no cell");
            return;
        }
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        return new Pathfinding({
            grid: this.grid,
            start: entity.cell.qr(),
            dest: dest,
            limit: lim,
            hexagonal: true,
        });
    }

    getAllEntities(): Entity[] {
        return this.teams.map((team) => team.members).reduce<Entity[]>((acc, val) => [...acc, ...val], []);
    }

    getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: (tree: Roact.Tree) => {
                    Roact.unmount(tree);
                    this.bcamera.enterHOI4Mode(entity.cell?.worldPosition()).then(() => {
                        this.gui?.enterMovement();
                    });
                },
            },
            {
                type: CharacterActionMenuAction.EndTurn,
                run: (tree: Roact.Tree) => {
                    Roact.unmount(tree);
                    this.endTurn();
                },
            },
        ];
    }

    async moveEntity(entity: Entity, toCell: HexCell, path?: Vector2[]) {
        if (!entity.cell) {
            warn("Entity has no cell");
            return;
        }
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        const calculatedPath =
            path ??
            new Pathfinding({
                grid: this.grid,
                start: entity.cell.qr(),
                dest: toCell.qr(),
                limit: lim,
            }).begin();

        if (calculatedPath.size() === 0) {
            warn(
                `No path found from ${entity.cell.qr().X}, ${entity.cell.qr().Y} to ${toCell.qr().X}, ${toCell.qr().Y}`,
            );
            return;
        }

        let destination = toCell;
        if (!toCell.isVacant()) {
            const adjacentCell = this.grid.getCell(calculatedPath[calculatedPath.size() - 1]);
            if (adjacentCell?.isVacant()) {
                destination = adjacentCell;
            } else {
                warn("Destination cell and adjacent cell are not vacant");
                return;
            }
        }

        this.gui?.mountOrUpdateGlowPath(calculatedPath);
        return entity.moveToCell(destination, calculatedPath);
    }

    getCurrentRoundEntity() {
        return this.currentRound;
    }

    //#endregion

    //#region Battle Flow

    private initializeEntitiesPositions() {
        const allEntities = this.getAllEntities();
        const vacantCells = this.grid.cells.filter((cell) => cell.isVacant());

        if (vacantCells.size() < allEntities.size()) {
            warn("Not enough vacant cells to spawn all entities");
            return;
        }

        for (const entity of allEntities) {
            const randomCell = vacantCells.pop();
            if (randomCell) entity.setCell(randomCell);
        }

        allEntities.forEach((e) => e.initialiseCharacteristics());
    }

    startBattle() {
        if (this.time === -1) {
            this.initializeEntitiesPositions();
            this.round();
        }
    }

    private incrementTime() {
        return ++this.time;
    }

    private async round() {
        this.incrementTime();
        this.status = BattleStatus.Begin;

        const nextEntity = await this.runReadinessGauntlet();
        if (!nextEntity) {
            await this.bcamera.enterHOI4Mode(this.currentRound?.cell?.qrs);
            this.round();
            return;
        }

        await this.waitForEntityAction(nextEntity);
        this.updateEntityStatsAfterRound(nextEntity);
        this.finalizeRound();
        this.round();
    }

    private updateEntityStatsAfterRound(entity: Entity) {
        entity.pos /= 2;
    }

    private endTurn() {
        this.gui?.guiDoneRoundExit();
    }

    private waitForEntityAction(entity: Entity) {
        this.currentRound = entity;
        return this.bcamera.enterCharacterCenterMode().then(() => {
            return new Promise((resolve) => {
                this.gui?.initiateRound(resolve);
                entity.playAudio(EntityStatus.Idle);
            });
        });
    }

    private finalizeRound() {
        this.currentRound = undefined;
        wait(1);
    }

    //#endregion

    //#region Combat Mechanics

    calculateRealityValue(reality: Reality, entity: Entity) {
        if (reality === Reality.Maneuver) {
            return entity.stats.spd * entity.stats.acr;
        }
        return 0;
    }

    initializeAttackClickHandler(): RBXScriptConnection {
        this.onAttackClickedScript?.Disconnect();
        this.onAttackClickedScript = this.onAttackClickedSignal.Connect((ability) => {
            if (!ability.target.cell?.qr()) {
                warn("Target cell not found");
                return;
            }
            const attackAction: AttackAction = { executed: false, ability };
            const clashResult = this.clash(attackAction);
            this.playAttackAnimation(attackAction);
        });
        return this.onAttackClickedScript;
    }

    async playAttackAnimation(attackAction: AttackAction) {
        const { using: attacker, target, animation } = attackAction.ability;
        if (!attacker.model?.PrimaryPart || !target.model?.PrimaryPart) {
            warn("Primary Part not found for attacker or target");
            return;
        }

        this.gui?.exitMovement();
        await target.faceEntity(attacker);

        const attackerAnimationTrack = attacker.playAnimation({
            animation,
            priority: Enum.AnimationPriority.Action4,
            loop: false,
        });
        const targetInitAnimationTrack = target.playAnimation({
            animation: "defend",
            priority: Enum.AnimationPriority.Action2,
            loop: false,
        });
        let targetAnimationTrack: AnimationTrack | undefined;

        const hitConnection = attackerAnimationTrack?.GetMarkerReachedSignal("Hit").Connect(() => {
            targetAnimationTrack = target.playAnimation({
                animation: "defend-hit",
                priority: Enum.AnimationPriority.Action3,
                loop: false,
            });
        });

        const endConnection = attackerAnimationTrack?.Ended.Connect(() => {
            hitConnection?.Disconnect();
            endConnection?.Disconnect();
            const transition = target.playAnimation({
                animation: "defend->idle",
                priority: Enum.AnimationPriority.Action4,
                loop: false,
            });
            target.animationHandler?.idleAnimationTrack?.Stop();
            targetInitAnimationTrack?.Stop();
            targetAnimationTrack?.Stop();
            transition?.Stopped.Wait();
            this.applyClash(attackAction, this.clash(attackAction));
        });

        targetInitAnimationTrack?.Ended.Wait();
        attackerAnimationTrack?.Ended.Wait();
        targetAnimationTrack?.Ended.Wait();

        attacker.playAudio(EntityStatus.Idle);
        this.gui?.enterMovement();
    }

    applyClash(attackAction: AttackAction, clashResult: ClashResult) {
        attackAction.ability.target.hip -= clashResult.damage;
    }

    clash(attackAction: AttackAction): ClashResult {
        const { using: attacker, target, acc, calculateDamage } = attackAction.ability;
        let fate: ClashResultFate = "Miss";
        let damage = 0;

        const hitRoll = math.random(1, 100);
        const hitChance = acc - this.calculateRealityValue(Reality.Maneuver, target);
        const critChance = this.calculateRealityValue(Reality.Precision, attacker);

        const abilityDamage = calculateDamage();
        const minDamage = abilityDamage * 0.5;
        const maxDamage = abilityDamage;

        if (hitRoll <= hitChance) {
            if (hitRoll <= hitChance * 0.1 + critChance) {
                damage = math.random((minDamage + maxDamage) / 2, maxDamage) * 2;
                fate = "CRIT";
            } else {
                damage = math.random(minDamage, maxDamage);
                fate = "Hit";
            }
        }

        damage = math.clamp(damage, 0, 1000);
        return { damage, u_damage: damage, fate, roll: hitRoll };
    }

    //#endregion

    //#region Readiness Mechanics

    getReadinessIcons(): ReadinessIcon[] {
        return this.getAllEntities().map((entity) => ({
            iconID: entity.playerID,
            iconUrl: "rbxassetid://18915919565",
            readiness: entity.pos / 100,
        }));
    }

    calculateReadinessIncrement(entity: Entity) {
        return entity.stats.spd + math.random(-0.1, 0.1) * entity.stats.spd;
    }

    runReadinessGauntlet() {
        const entities = this.getAllEntities();
        if (entities.size() === 0) return;

        while (entities.some((e) => e.pos < 100)) {
            this.iterateReadinessGauntlet(entities);
        }

        const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
        return this.gui?.tweenToUpdateReadiness()?.then(() => winner);
    }

    private iterateReadinessGauntlet(entities: Entity[]) {
        for (const entity of entities) {
            entity.pos += this.calculateReadinessIncrement(entity);
            if (entity.pos >= 100) {
                entity.pos = 100;
            }
        }
    }

    //#endregion
}
