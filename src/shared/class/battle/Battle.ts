import Roact from "@rbxts/roact";
import { UserInputService } from "@rbxts/services";
import { MOVEMENT_COST, TILE_SIZE } from "shared/const";
import {
    AttackAction,
    BattleStatus,
    BotType,
    CharacterActionMenuAction,
    CharacterMenuAction,
    ClashResult,
    ClashResultFate,
    EntityStats,
    EntityStatus,
    ReadinessIcon,
    Reality
} from "shared/types/battle-types";
import { requestData } from "shared/utils";
import { remoteEventsMap } from "shared/utils/events";
import BattleCamera from "./BattleCamera";
import BattleGui from "./BattleGui";
import Pathfinding from "./Pathfinding";
import Ability from "./system/Ability";
import Entity from "./system/Entity";
import HexCell from "./system/hex/HexCell";
import HexGrid from "./system/hex/HexGrid";

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
    private bcamera: BattleCamera;
    private gui: BattleGui;

    onAttackClickedScript?: RBXScriptConnection;
    escapeScript?: RBXScriptConnection;

    attackRemoteEvent: RemoteEvent = remoteEventsMap["Attack"]

    status: BattleStatus = BattleStatus.Inactive;
    currentRound?: Entity;
    time: number = -1;
    teams: BattleTeam[] = [];

    grid: HexGrid;
    gridMin: Vector2;
    gridMax: Vector2;

    //#region Initializations
    /**
     * Creates a new Battle instance with the provided configuration.
     * 
     * @param config - The configuration object for the battle.
     * @param config.camera - The camera to be used in the battle.
     * @param config.worldCenter - The center position of the world.
     * @param config.width - The width of the battle area.
     * @param config.height - The height of the battle area.
     * @param config.teamMap - A record mapping team names to arrays of players.
     * 
     * @returns A new instance of the Battle class.
     */
    static Create(config: {
        camera: Camera,
        worldCenter: Vector3,
        width: number;
        height: number;
        teamMap: Record<string, Player[]>;
    }): Battle {
        const battle = new Battle(config.worldCenter, TILE_SIZE, config.width, config.height, config.camera);
        battle.initializeCamera();
        battle.initializeGrid();
        battle.initializeTeams(config.teamMap);
        battle.initialiseBattle();
        return battle;
    }
    /**
     * Creates an instance of the Battle class.
     * 
     * @private
     * @constructor
     * @param {Vector3} worldCenter - The center point of the world in 3D space.
     * @param {number} size - The size of each hexagon in the grid.
     * @param {number} width - The width of the grid in hexagons.
     * @param {number} height - The height of the grid in hexagons.
     * @param {Camera} camera - The camera used for the battle view.
     */
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
        this.gui = BattleGui.Connect(this.getReadinessIcons(), this.grid);
    }
    /**
     * Initializes the grid by calling the materialise method on the grid object.
     * This method sets up the grid for further operations.
     */
    private initializeGrid() {
        this.grid.materialise();
    }
    /**
     * Initializes the camera by setting it to HOI4 mode.
     * This method configures the camera to enter a specific mode
     * defined by the `enterHOI4Mode` method of the `bcamera` object.
     */
    private initializeCamera() {
        this.bcamera.enterHOI4Mode();
    }
    /**
     * Initializes the teams for the battle.
     *
     * @param teamMap - A record where the key is the team name and the value is an array of players belonging to that team.
     *
     * This method iterates over the provided team map, processes each player to create an `Entity` object, and then
     * groups these entities into `BattleTeam` objects which are added to the `teams` array.
     *
     * Each player is mapped to an `Entity` object by fetching their character stats and other relevant information.
     * If the character stats are not found, a warning is logged and the player is skipped.
     *
     * @remarks
     * - The `playerID` is generated by adding a random number to the player's `UserId`.
     * - If the player's `UserId` is 0, the entity is marked as an enemy bot.
     * - The `characterID` is currently hardcoded as 'entity_adalbrecht' for temporary purposes.
     */
    private initializeTeams(teamMap: Record<string, Player[]>) {
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList
                .mapFiltered((player) => {
                    // const characterID = player.Character ? player.Character.Name : "default_character";
                    const characterID = 'entity_adalbrecht'; // temp
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
                        sta: 0,
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

    public initialiseBattle() {
        if (this.time === -1) {
            this.status = BattleStatus.Begin;
            this.initializeEntitiesPositions();
            this.round();
        }
    }

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
    //#endregion

    //#region Entity Management

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
                        this.enterMovementMode();
                    });
                },
            },
            {
                type: CharacterActionMenuAction.EndTurn,
                run: (tree: Roact.Tree) => {
                    Roact.unmount(tree);
                    this.endTurn?.(void 0);
                },
            },
        ];
    }
    /**
     * Moves an entity to a specified cell along a calculated path.
     *
     * @param entity - The entity to be moved.
     * @param toCell - The destination cell to move the entity to.
     * @param path - An optional pre-calculated path for the entity to follow. If not provided, a path will be calculated.
     * @returns A promise that resolves when the entity has been moved.
     *
     * @remarks
     * - If the entity does not have a current cell, a warning is logged and the function returns early.
     * - The path is calculated using the entity's position and movement cost.
     * - If no path is found, a warning is logged and the function returns early.
     * - If the destination cell is not vacant, the function attempts to find an adjacent vacant cell.
     * - The GUI is updated to reflect the calculated path.
     */
    async moveEntity(entity: Entity, toCell: HexCell, path?: Vector2[]): Promise<void> {
        //#region 
        if (!entity.cell) {
            warn("moveEntity: Entity has no cell");
            return;
        }
        //#endregion
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        const calculatedPath =
            path ??
            new Pathfinding({
                grid: this.grid,
                start: entity.cell.qr(),
                dest: toCell.qr(),
                limit: lim,
            }).begin();
        //#region 
        if (calculatedPath.size() === 0) {
            warn(`Move Entity: No path found from ${entity.cell.qr().X}, ${entity.cell.qr().Y} to ${toCell.qr().X}, ${toCell.qr().Y}`,);
            return;
        }
        //#endregion
        let destination = toCell;
        if (!toCell.isVacant()) {
            const adjacentCell = this.grid.getCell(calculatedPath[calculatedPath.size() - 1]);
            if (adjacentCell?.isVacant()) {
                destination = adjacentCell;
            } else {
                warn("Move Entity: Destination cell and adjacent cell are not vacant");
                return;
            }
        }

        this.gui.mountOrUpdateGlow(calculatedPath.mapFiltered((v) => this.grid.getCell(v)));
        return entity.moveToCell(destination, calculatedPath);
    }
    //#endregion

    //#region Battle Flow
    endTurn?: (value: unknown) => void
    private async round() {
        const r = this.incrementTime();

        this.currentRound = await this.runReadinessGauntlet();
        if (!this.currentRound) {
            warn("No entity found to start the next round");
            await this.bcamera.enterHOI4Mode();
            this.round();
            return;
        }

        this.initializeAttackClickHandler();

        this.status = BattleStatus.CameraTravel;
        await this.bcamera.enterCharacterCenterMode();

        await new Promise((resolve) => {
            const cre = this.currentRound
            //#region 
            if (!cre) {
                warn("No current round entity found");
                return;
            }
            //#endregion
            this.endTurn = resolve;
            this.gui.mountActionMenu(this.getCharacterMenuActions(cre));
            cre.playAudio(EntityStatus.Idle);
        });

        this.finalizeRound(this.currentRound);
        this.round();
    }

    private incrementTime() {
        print(`Round ${this.time + 1} has begun!`);
        return ++this.time;
    }

    private updateEntityStatsAfterRound(entity: Entity) {
        print(`${entity.name} has ${entity.pos} readiness points`);
        entity.pos /= 2;
        print(`${entity.name} has ${entity.pos} readiness points`);
    }
    /**
     * Set up a script that listens for the escape key (X) to cancel the current action
     * @returns the script connection
     */
    private setUpCancelCurrentActionScript(): RBXScriptConnection {
        this.escapeScript?.Disconnect();
        this.escapeScript = UserInputService.InputBegan.Connect((i, gpe) => {
            if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                this.returnToSelections();
            }
        })
        return this.escapeScript;
    }
    /**
     * Return to the selection screen after movement or canceling an action
     *  1. exitMovementUI() is called to reset the UI
     *  2. The camera is centered on the current entity
     *  3. going back to the action selection screen
     */
    private async returnToSelections() {
        this.exitMovementMode()
        await this.bcamera.enterCharacterCenterMode()
        if (this.currentRound) {
            this.gui.mountActionMenu(this.getCharacterMenuActions(this.currentRound));
        }
    }

    private finalizeRound(nextEntity: Entity) {
        this.onAttackClickedScript?.Disconnect();
        this.updateEntityStatsAfterRound(nextEntity);
        this.currentRound = undefined;
    }
    //#endregion

    //#region Combat Mechanics

    public calculateRealityValue(reality: Reality, entity: Entity): number {
        switch (reality) {
            case Reality.HP:
                return (entity.stats.end * 5) + (entity.stats.siz * 2);
            case Reality.Force:
                return (entity.stats.str * 2) + (entity.stats.spd * 1) + (entity.stats.siz * 1);
            case Reality.Mana:
                return (entity.stats.int * 3) + (entity.stats.spr * 2) + (entity.stats.fai * 1);
            case Reality.Spirituality:
                return (entity.stats.spr * 2) + (entity.stats.fai * 2) + (entity.stats.wil * 1);
            case Reality.Divinity:
                return (entity.stats.fai * 3) + (entity.stats.wil * 2) + (entity.stats.cha * 1);
            case Reality.Precision:
                return (entity.stats.dex * 2) + (entity.stats.acr * 1) + (entity.stats.spd * 1);
            case Reality.Maneuver:
                return (entity.stats.acr * 2) + (entity.stats.spd * 2) + (entity.stats.dex * 1);
            case Reality.Convince:
                return (entity.stats.cha * 2) + (entity.stats.beu * 1) + (entity.stats.int * 1);
            case Reality.Bravery:
                return (entity.stats.wil * 2) + (entity.stats.end * 1) + (entity.stats.fai * 1);
            default:
                warn(`Reality value for ${reality} not found`);
                return 0;
        }
    }


    async executeAttackSequence(ability: Ability) {
        print(`Attack clicked: ${ability}`);
        if (!ability.target.cell?.qr()) {
            warn("Target cell not found");
            return;
        }

        const attackAction: AttackAction = { executed: false, ability };
        const clashResult = this.clash(attackAction);
        this.exitMovementMode()
        await this.playAttackAnimation(attackAction);
        this.enterMovementMode();
        this.applyClash(attackAction, clashResult);
    }

    initializeAttackClickHandler(): void {
        this.onAttackClickedScript?.Disconnect();
        // this.onAttackClickedScript = this.onAttackClickedSignal.OnServerEvent.Connect((player, _ability) => {
        //     const ability = _ability as Ability;
        //     this.executeAttackSequence(ability);
        // });
        // return this.onAttackClickedScript;
    }
    /**
     * Enter movement mode
     * 
     * Movement mode: when cells glow along with the cursor to create a pathfinding effect.
     * 
     * Steps:
     * 
     * 1. Set up scripts:
     *    - Set up an escape script to cancel the current action.
     * 
     * 2. Rendering:
     *    - Re-render the UI to include sensitive cells.
     *    - Mount the ability slots for the current entity.
     */
    enterMovementMode() {
        print("Entering movement mode");
        this.escapeScript = this.setUpCancelCurrentActionScript();
        const cre = this.currentRound;
        if (cre) {
            this.gui.mountAbilitySlots(cre);
            this.gui.updateMainUI('withSensitiveCells', {
                cre: cre!,
                grid: this.grid,
                readinessIcons: this.getReadinessIcons(),
            });
        }
    }
    exitMovementMode() {
        this.escapeScript?.Disconnect();
        this.gui.clearAllLooseGui();
        this.gui.clearAllLooseScript();
        this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });
    }

    async playAttackAnimation(attackAction: AttackAction) {
        const { using: attacker, target, animation } = attackAction.ability;
        //#region 
        if (!attacker.model?.PrimaryPart || !target.model?.PrimaryPart) {
            warn("Primary Part not found for attacker or target");
            return;
        }
        //#endregion

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
        });

        if (targetInitAnimationTrack?.IsPlaying) await targetInitAnimationTrack?.Ended.Wait();
        if (attackerAnimationTrack?.IsPlaying) await attackerAnimationTrack?.Ended.Wait();
        if (targetAnimationTrack?.IsPlaying) await targetAnimationTrack?.Ended.Wait();

        attacker.playAudio(EntityStatus.Idle);
    }

    applyClash(attackAction: AttackAction, clashResult: ClashResult) {
        print(`Clash Result: ${clashResult.fate} | Damage: ${clashResult.damage}`);
        attackAction.ability.target.damage(clashResult.damage);
    }

    clash(attackAction: AttackAction): ClashResult {
        const { using: attacker, target, acc } = attackAction.ability;
        print(`Attacker: ${attacker.name} | Target: ${target.name} | Accuracy: ${acc}`);

        let fate: ClashResultFate = "Miss";
        let damage = 0;

        const hitRoll = math.random(1, 100);
        const hitChance = acc - this.calculateRealityValue(Reality.Maneuver, target);
        const critChance = this.calculateRealityValue(Reality.Precision, attacker);

        const abilityDamage = attackAction.ability.calculateDamage();
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
        this.status = BattleStatus.RunReadiness;
        const entities = this.getAllEntities();
        if (entities.size() === 0) return;

        while (!entities.some((e) => e.pos >= 100)) {
            this.iterateReadinessGauntlet(entities);
        }

        const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
        return this.gui.tweenToUpdateReadiness(this.getReadinessIcons()).then(() => winner);
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