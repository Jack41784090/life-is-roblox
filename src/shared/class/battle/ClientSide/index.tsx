import { Players, RunService, UserInputService } from "@rbxts/services";
import { GuiTag, MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClashResult, ClientSideConfig, ControlLocks, EntityStatus, TILE_SIZE } from "shared/types/battle-types";
import { isAttackKills, warnWrongSideCall } from "shared/utils";
import Ability, { AbilityState } from "../Ability";
import Entity from "../Entity";
import { AnimationType } from "../Entity/AnimationHandler";
import HexCell from "../Hex/Cell";
import Pathfinding from "../Pathfinding";
import State, { Team } from "../State";
import BattleCam from "./BattleCamera";
import Gui from "./Gui";

export default class ClientSide {
    private initialised: boolean = false;
    private initialiser: Promise<void>;

    private remotees: Array<() => void> = [];

    public gui: Gui;
    public camera: BattleCam;

    private state: State;

    private controlLocks: ControlLocks = new Map();

    private constructor({ worldCenter, size, width, height, camera }: ClientSideConfig) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);
        this.state = new State({
            width,
            height,
            worldCenter,
            teamMap: {},
        });
        this.gui = Gui.Connect(this.getReadinessIcons(), this.state.grid);
        this.initialiser = this.initialiseGraphics()!;
        // this.initialiser = Promise.resolve();
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
            remotes.battle.createClient(config.client, config);
        }
        else {
            // Client-side Creation
            const cs = new ClientSide({
                ...config,
                size: TILE_SIZE,
            });

            cs.setUpRemotes();
            cs.initialiseInputControl();

            return cs;
        }
    }

    //#region Remote Communications
    private setUpRemotes() {
        if (RunService.IsServer()) {
            warnWrongSideCall("setUpRemote")
            return;
        }
        this.cleanUpRemotes();
        this.remotees = [
            remotes.battle.ui.mount.actionMenu.connect(() => {
                this.localEntity().andThen(e => {
                    if (!e) return;
                    this.gui.mountActionMenu(this.getCharacterMenuActions(e));
                })
            }),
            remotes.battle.ui.mount.otherPlayersTurn.connect(() => {
                this.gui.mountOtherPlayersTurnGui();
            }),
            remotes.battle.forceUpdate.connect(() => {
                this.requestUpdateEntities();
                this.requestUpdateGrid();
            })
        ]
    }

    private cleanUpRemotes() {
        this.remotees.forEach(r => r());
    }
    //#endregion

    //#region Updates

    private async requestUpdateEntities() {
        const teamStates = await remotes.battle.requestSync.team();

        // 1. Numerically sync
        this.state.sync({
            teams: teamStates,
        });

        // 2. Graphically sync


        return teamStates;
    }

    private async requestUpdateGrid() {
        const r = await remotes.battle.requestSync.map();
        this.state.sync({
            grid: r,
        })
        return r;
    }

    private initialiseInputControl() {
        UserInputService.InputBegan.Connect((io, gpe) => {
            this.onInputBegan(io, gpe);
        })
    }
    /**
     * initialises the camera by setting it to HOI4 mode.
     * This method configures the camera to enter a specific mode
     * defined by the `enterHOI4Mode` method of the `camera` object.
     */
    private initialiseCamera() {
        this.camera.enterHOI4Mode();
    }

    private initialiseGraphics() {
        if (this.initialised) return;

        this.initialiseCamera();
        return Promise.all([
            this.requestUpdateGrid(),
            this.requestUpdateEntities(),
        ]).then(() => {
            this.initialised = true;
        })
    }
    //#endregion

    //#region Unmanaged
    private getReadinessIcons() {
        // const crMap = this.entitiesReadinessMapAtom();
        // const readinessIcons: ReadinessIcon[] = [];
        // for (const [i, x] of pairs(crMap)) {
        //     readinessIcons.push({
        //         playerID: i,
        //         iconUrl: '',
        //         readiness: x
        //     })
        // }
        // return readinessIcons;

        return [];
    }
    //#endregion

    //#region Entity Management
    private async localEntity() {
        const localPlayer = Players.LocalPlayer;
        await this.initialiser;
        const e = this.state.findEntity(localPlayer.UserId);
        if (!e) {
            warn("Local entity not found");
            return;
        }
        return e;
    }

    private appendEntity(entity: Entity, qr: Vector2): HexCell
    private appendEntity(entity: Entity, x: number, y: number): HexCell
    private appendEntity(entity: Entity, x: Vector2 | number, y?: number) {
        const c = typeOf(x) === "Vector2" ? this.state.grid.getCell(x as Vector2) : this.state.grid.getCell(x as number, y!);
        assert(c, "Cell not found");
        this.state.teams.push(new Team(entity.team ?? `${entity.playerID}`, [entity]));
        return entity.setCell(c);
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
                grid: this.state.grid,
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
            const adjacentCell = this.state.grid.getCell(calculatedPath[calculatedPath.size() - 1]);
            if (adjacentCell?.isVacant()) {
                destination = adjacentCell;
            } else {
                warn("Move Entity: Destination cell and adjacent cell are not vacant");
                return;
            }
        }

        // this.gui.mountOrUpdateGlow(calculatedPath.mapFiltered((v) => this.grid.getCell(v)));
        return entity.moveToCell(destination, calculatedPath.mapFiltered((v) => this.state.grid.getCell(v)));
    }
    //#endregion

    //#region UI Movement

    public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: () => {
                    remotes.battle.requestToAct().then(async accessToken => {
                        if (!accessToken.token) {
                            warn(`${Players.LocalPlayer.Name} has received no access token`);
                            return;
                        }
                        const newAccessToken = { ...accessToken, action: { actionType: ActionType.Move, by: entity.playerID, executed: false } };
                        this.enterMovementMode(newAccessToken);
                    })
                },
            },
            {
                type: CharacterActionMenuAction.EndTurn,
                run: () => {
                    // tree.unmount();
                    // this.endTurn?.(void 0);
                },
            },
        ];
    }
    /**
     * Return to the selection screen after movement or canceling an action
     *  1. exitMovementUI() is called to reset the UI
     *  2. The camera is centered on the current entity
     *  3. going back to the action selection screen
     */
    private async returnToSelections(accessToken: AccessToken) {
        this.exitMovementMode(accessToken)
        await this.camera.enterCharacterCenterMode()
        await this.localEntity().then(e => {
            if (!e) return;
            this.gui.mountActionMenu(this.getCharacterMenuActions(e));
        })
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
    private async enterMovementMode(accessToken: AccessToken) {
        print("Entering movement mode", this.state.grid);
        const cre = this.state.findEntity(accessToken.userId);
        if (!cre) return;
        this.controlLocks.set(Enum.KeyCode.X, true);
        this.gui.unmountAndClear(GuiTag.ActionMenu);
        this.gui.mountAbilitySlots(cre);
        this.gui.updateMainUI('withSensitiveCells', {
            cre,
            entities: this.state.getAllEntities(),
            grid: this.state.grid,
            readinessIcons: this.getReadinessIcons(),
            accessToken
        });
    }

    private exitMovementMode(accessToken: AccessToken) {
        this.controlLocks.delete(Enum.KeyCode.X);
        this.gui.clearAll();
        this.gui.updateMainUI('onlyReadinessBar', {
            entities: this.state.getAllEntities(),
            readinessIcons: this.getReadinessIcons(),
            accessToken
        });
    }

    //#endregion

    //#region Inputs

    private onInputBegan(io: InputObject, gpe: boolean) {
        if (!this.controlLocks.get(io.KeyCode)) {
            // play "invalid input" audio
            return;
        }

        // switch (io.KeyCode) {
        //     case Enum.KeyCode.X:
        //         if (!gpe) {
        //             const entity = this.currentRoundEntity();
        //             if (entity) this.returnToSelections(entity);
        //         };
        //         break;
        // }
    }
    //#endregion

    //#region Animations

    private realiseClashResult(clashResult: ClashResult & { abilityState: AbilityState }) {
        print("Attack clash result received", clashResult);

        const allEntities = this.state.getAllEntities();
        const using = allEntities.find((e) => e.playerID === clashResult.abilityState.using);
        const target = allEntities.find((e) => e.playerID === clashResult.abilityState.target);

        if (!using || !target) {
            warn("Using or target entity not found", using, target);
            return;
        }
        const ability = new Ability({
            ...clashResult.abilityState,
            using,
            target,
        });
        this.executeAttackSequence({ actionType: ActionType.Attack, by: using.playerID, executed: true, ability, clashResult });
    }

    private async executeAttackSequence(attackAction: AttackAction) {
        // this.exitMovementMode()
        await this.playAttackAnimation(attackAction);
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