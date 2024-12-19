import { atom } from "@rbxts/charm";
import { client, SyncPayload } from "@rbxts/charm-sync";
import { RunService, UserInputService } from "@rbxts/services";
import { MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { ClientSideConfig, HexGridConfig } from "shared/types";
import { AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClashResult, ControlLocks, EntityReadinessMap, EntityStatus, ReadinessIcon, TILE_SIZE } from "shared/types/battle-types";
import { isAttackKills, warnWrongSideCall } from "shared/utils";
import Ability, { AbilityState } from "../Ability";
import Entity from "../Entity";
import { AnimationType } from "../Entity/AnimationHandler";
import HexCell from "../Hex/Cell";
import HexGrid from "../Hex/Grid";
import Pathfinding from "../Pathfinding";
import BattleCam from "./BattleCamera";
import Gui from "./Gui";

export default class ClientSide {
    private cleanUp?: () => void;

    private time = 0;

    public entities: Entity[] = [];
    public currentRoundEntity?: Entity;

    public grid: HexGrid;
    public gui: Gui;
    public camera: BattleCam;

    private readinessSyncerClient;
    private entitiesReadinessMapAtom = atom<EntityReadinessMap>({});
    private controlLocks: ControlLocks = new Map();

    private constructor({ worldCenter, size, width, height, camera }: ClientSideConfig) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);
        this.grid = new HexGrid({
            center: new Vector2(0, 0),
            radius: TILE_SIZE,
            size: TILE_SIZE,
            name: "Bat",
        })
        this.gui = Gui.Connect(this.getReadinessIcons(), this.grid);
        this.readinessSyncerClient = client({
            atoms: {
                entitiesReadinessMap: this.entitiesReadinessMapAtom,
            }
        })

        this.setUpRemotes();
        UserInputService.InputBegan.Connect((io, gpe) => {
            this.onInputBegan(io, gpe);
        })

        // this.initializeGraphics();
        remotes.battle.requestMapUpdate().then(r => {
            this.remote_updateMap(r);
        })
    }

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
    public static async Create(config: {
        camera: Camera,
        worldCenter: Vector3,
        width: number;
        height: number;
        client: Player;
    }) {
        if (RunService.IsServer()) {
            // Server-side Creation
            remotes.battle_ClientBegin(config.client, config);
        }
        else {
            // Client-side Creation
            return new ClientSide({
                ...config,
                size: TILE_SIZE,
            });
        }
    }

    //#region Remote Communications
    private setUpRemotes() {
        if (RunService.IsServer()) {
            warnWrongSideCall("setUpRemote")
            return;
        }
        const cu1 = remotes.battle_UpdateMap.connect((hgc) => {
            this.remote_updateMap(hgc);
        })
        const cu2 = remotes.battle_readinessSync.connect((payload) => {
            this.remote_readinessSync(payload);
        })
        const cu3 = remotes.battle_AddEntity.connect((init, pos) => {
            const entity = new Entity(init);
            this.appendEntity(entity, pos.X, pos.Y);
        })
        const c4 = remotes.battle.ui.mount.actionMenu.connect(() => {
            this.gui.mountActionMenu(this.getCharacterMenuActions(this.currentRoundEntity!));
        })


        remotes.battle_readinessSyncHydrate();

        this.cleanUp = () => {
            cu1(); cu2(); cu3();
        }
    }

    private remote_readinessSync(payload: SyncPayload<{
        entitiesReadinessMap: Charm.Atom<EntityReadinessMap>;
    }>) {
        this.readinessSyncerClient.sync(payload);
    }

    private remote_updateMap(c: HexGridConfig) {
        this.grid = new HexGrid(c);
        this.grid.initialise();
        this.grid.materialise();
    }
    //#endregion

    private getReadinessIcons() {
        const crMap = this.entitiesReadinessMapAtom();
        const readinessIcons: ReadinessIcon[] = [];
        for (const [i, x] of pairs(crMap)) {
            readinessIcons.push({
                playerID: i,
                iconUrl: '',
                readiness: x
            })
        }
        return readinessIcons;
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
     * defined by the `enterHOI4Mode` method of the `camera` object.
     */
    private initializeCamera() {
        this.camera.enterHOI4Mode();
    }

    private initializeGraphics() {
        this.initializeCamera();
        this.initializeGrid();
    }

    private initializeEntitiesCharacteristics() {
        const allEntities = this.getAllEntities();
        allEntities.forEach((e) => e.initialiseCharacteristics());
    }

    private getAllEntities() {
        return this.entities;
    }

    public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: (tree: ReactRoblox.Root) => {
                    tree.unmount();
                    this.camera.enterHOI4Mode(entity.cell?.worldPosition()).then(() => {
                        this.enterMovementMode();
                    });
                },
            },
            {
                type: CharacterActionMenuAction.EndTurn,
                run: (tree: ReactRoblox.Root) => {
                    tree.unmount();
                    // this.endTurn?.(void 0);
                },
            },
        ];
    }

    private realiseClashResult(clashResult: ClashResult & { abilityState: AbilityState }) {
        print("Attack clash result received", clashResult);

        const using = this.getAllEntities().find((e) => e.playerID === clashResult.abilityState.using);
        const target = this.getAllEntities().find((e) => e.playerID === clashResult.abilityState.target);

        if (!using || !target) {
            warn("Using or target entity not found", using, target);
            return;
        }
        const ability = new Ability({
            ...clashResult.abilityState,
            using,
            target,
        });
        this.executeAttackSequence({ executed: true, ability, clashResult });
    }

    private async round() {
        const r = this.incrementTime();

        this.gui.clearAll()
        this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });

        // remoteEvent_Readiness.FireServer('ReadyForReadinessCheck');

        // remoteEvent_Readiness.OnClientEvent.Once(async w => {
        //     const winner = this.getAllEntities().find(e => e.playerID === w as number);
        //     this.currentRoundEntity = winner;
        //     print(`${Players.LocalPlayer.Name} has received winner: ${winner?.name}`);
        //     if (!this.currentRoundEntity) {
        //         warn("No entity found to start the next round");
        //         // await this.camera.enterHOI4Mode();
        //         // this.round();
        //         return;
        //     }

        //     await this.camera.enterCharacterCenterMode();

        //     await new Promise((resolve) => {
        //         const cre = this.currentRoundEntity
        //         //#region 
        //         if (!cre) {
        //             warn("No current round entity found");
        //             return;
        //         }
        //         //#endregion
        //         this.endTurn = () => {
        //             resolve(void 0);
        //             this.gui.clearAll();
        //         }

        //         this.setUpAttackRemoteEventReceiver();

        //         if (cre.playerID !== Players.LocalPlayer.UserId) {
        //             // other player turn...
        //             this.gui.mountOtherPlayersTurnGui();
        //             if (cre.playerID === -1) {
        //                 wait(2);
        //                 this.endTurn(void 0);
        //             }
        //         }
        //         else {
        //             this.gui.mountActionMenu(this.getCharacterMenuActions(cre));
        //         }
        //         cre.playAudio(EntityStatus.Idle);
        //     });

        //     this.finalizeRound(this.currentRoundEntity);
        //     this.round();
        // })
    }

    private incrementTime() {
        print(`Round ${this.time + 1} has begun!`);
        return ++this.time;
    }

    //#region ENTITY MANAGEMENT

    private appendEntity(entity: Entity, x: number, y: number) {
        const c = this.grid.getCell(x, y);
        if (!c) {
            warn(`No cell @${x},${y}`)
            return undefined;
        }
        this.entities.push(entity);
        entity.setCell(c);
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
    protected async moveEntity(entity: Entity, toCell: HexCell, path?: Vector2[]): Promise<void> {
        //#region 
        if (!entity.cell) {
            warn("moveEntity: Entity has no cell");
            return;
        }
        //#endregion
        const lim = math.floor(entity.get('pos') / MOVEMENT_COST);
        const calculatedPath =
            path ??
            new Pathfinding({
                grid: this.grid,
                start: entity.cell.qr(),
                dest: toCell.qr(),
                limit: lim,
            }).begin();
        if (calculatedPath.size() === 0) {
            warn(`Move Entity: No path found from ${entity.cell.qr().X}, ${entity.cell.qr().Y} to ${toCell.qr().X}, ${toCell.qr().Y}`,);
            return;
        }
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

        // this.gui.mountOrUpdateGlow(calculatedPath.mapFiltered((v) => this.grid.getCell(v)));
        return entity.moveToCell(destination, calculatedPath.mapFiltered((v) => this.grid.getCell(v)));
    }
    //#endregion

    //#region INPUTS

    private onInputBegan(io: InputObject, gpe: boolean) {
        if (!this.controlLocks.get(io.KeyCode)) {
            // play "invalid input" audio
            return;
        }

        if (io.KeyCode === Enum.KeyCode.X && !gpe) {
            this.returnToSelections();
        }
    }
    /**
     * Return to the selection screen after movement or canceling an action
     *  1. exitMovementUI() is called to reset the UI
     *  2. The camera is centered on the current entity
     *  3. going back to the action selection screen
     */
    private async returnToSelections() {
        this.exitMovementMode()
        await this.camera.enterCharacterCenterMode()
        if (this.currentRoundEntity) {
            this.gui.mountActionMenu(this.getCharacterMenuActions(this.currentRoundEntity));
        }
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
    private enterMovementMode() {
        print("Entering movement mode");
        this.controlLocks.set(Enum.KeyCode.X, true);
        if (!this.currentRoundEntity) {
            warn("EnterMovement detects no cre")
            return;
        }
        this.gui.mountAbilitySlots(this.currentRoundEntity);
        this.gui.updateMainUI('withSensitiveCells', {
            cre: this.currentRoundEntity,
            grid: this.grid,
            readinessIcons: this.getReadinessIcons(),
        });
    }

    private exitMovementMode() {
        this.controlLocks.delete(Enum.KeyCode.X);
        this.gui.clearAll();
        this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });
    }
    //#endregion

    //#region ANIMATIONS
    private async executeAttackSequence(attackAction: AttackAction) {
        this.exitMovementMode()
        await this.playAttackAnimation(attackAction);
        this.enterMovementMode();
    }

    private async playAttackAnimation(attackAction: AttackAction) {
        const { using: attacker, target, animation } = attackAction.ability;

        if (!attacker.model?.PrimaryPart || !target.model?.PrimaryPart) {
            warn("[playAttackAnimation] PrimaryPart not found for attacker or target.");
            return;
        }

        await target.faceEntity(attacker);

        const attackAnimation = attacker.playAnimation({
            animation,
            priority: Enum.AnimationPriority.Action4,
            loop: false,
        });

        const defendIdleAnimation = target.playAnimation({
            animation: "defend",
            priority: Enum.AnimationPriority.Action2,
            loop: false,
        });

        if (!attackAnimation) {
            warn("[playAttackAnimation] Attacker animation track not found.");
            return;
        }

        try {
            await this.waitForAnimationMarker(attackAnimation, "Hit");
            target.animationHandler?.killAnimation(AnimationType.Idle);

            if (isAttackKills(attackAction)) {
                defendIdleAnimation?.Stop();
                target.playAnimation({
                    animation: "death-idle",
                    priority: Enum.AnimationPriority.Idle,
                    loop: true,
                })
                const deathAnimation = target.playAnimation({
                    animation: "death",
                    priority: Enum.AnimationPriority.Action3,
                    loop: false,
                });
            }
            else {
                defendIdleAnimation?.Stop();
                const gotHitAnimation = target.playAnimation({
                    animation: "defend-hit",
                    priority: Enum.AnimationPriority.Action3,
                    loop: false,
                });

                await this.waitForAnimationEnd(attackAnimation);
                if (gotHitAnimation) await this.waitForAnimationEnd(gotHitAnimation);

                const transitionTrack = target.playAnimation({
                    animation: "defend->idle",
                    priority: Enum.AnimationPriority.Action4,
                    loop: false,
                });

                transitionTrack?.Ended.Wait();
                target.playAnimation({
                    animation: "idle",
                    priority: Enum.AnimationPriority.Idle,
                    loop: true,
                })
            }
        } catch (error) {
            warn(`[playAttackAnimation] Error during attack animation: ${error}`);
        }

        attacker.playAudio(EntityStatus.Idle);
    }
    /**
     * Waits for a specific marker in an animation track.
     * @param track The animation track to monitor.
     * @param markerName The name of the marker to wait for.
     */
    private async waitForAnimationMarker(track: AnimationTrack, markerName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = track.GetMarkerReachedSignal(markerName).Once(() => {
                resolve();
            });

            wait(5);
            if (connection.Connected) {
                connection.Disconnect();
                reject();
            }
        });
    }
    /**
     * Waits for an animation track to end.
     * @param track The animation track to monitor.
     */
    private async waitForAnimationEnd(track: AnimationTrack): Promise<void> {
        return new Promise((resolve) => {
            const connection = track.Ended.Connect(() => {
                connection.Disconnect();
                resolve();
            });
        });
    }
    //#endregion
}