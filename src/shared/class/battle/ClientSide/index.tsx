import { Players, RunService, UserInputService } from "@rbxts/services";
import { GuiTag } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClashResult, ClientSideConfig, ControlLocks, TILE_SIZE } from "shared/types/battle-types";
import { warnWrongSideCall } from "shared/utils";
import Ability, { AbilityState } from "../Ability";
import Entity from "../Entity";
import State from "../State";
import BattleCam from "./BattleCamera";
import EntityHexCellGraphicsMothership from "./EHCG/Mothership";
import Gui from "./Gui";

export default class ClientSide {
    private graphicsInitialised: ReturnType<ClientSide["initialiseGraphics"]>;

    private remotees: Array<() => void> = [];

    public gui: Gui;
    public camera: BattleCam;

    private state: State;
    private EHCGMS: EntityHexCellGraphicsMothership;

    private controlLocks: ControlLocks = new Map();

    private constructor({ worldCenter, size, width, height, camera }: ClientSideConfig) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);
        this.state = new State({
            width,
            worldCenter,
            teamMap: {},
        });
        this.EHCGMS = new EntityHexCellGraphicsMothership(math.floor(width / 2), height, size, this.state.grid);

        this.gui = Gui.Connect(this.getReadinessIcons(), this.state.grid);
        this.graphicsInitialised = this.initialiseGraphics();
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
                    if (e) this.gui.mountActionMenu(this.getCharacterMenuActions(e));
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
        const r = await remotes.battle.requestSync.team();
        this.state.sync({
            teams: r,
        });
        this.EHCGMS.syncTeams(r);
        return r;
    }

    private async requestUpdateGrid() {
        const r = await remotes.battle.requestSync.map();
        this.state.sync({
            grid: r,
        })
        this.EHCGMS.syncGrid(r);
        return r;
    }

    private async requestUpdateState() {
        const r = await remotes.battle.requestSync.state();
        this.state.sync(r);
        this.EHCGMS.syncTeams(r.teams);
        this.EHCGMS.syncGrid(r.grid);
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
        this.initialiseCamera();
        return Promise.all([
            this.requestUpdateState(),
        ]);
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
    private async localEntity(): Promise<Entity | undefined> {
        const localPlayer = Players.LocalPlayer;
        await this.graphicsInitialised;
        const e = this.state.findEntity(localPlayer.UserId);
        if (!e) return;
        return e;
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
                        const newAccessToken = {
                            ...accessToken,
                            action: {
                                actionType: ActionType.Move,
                                to: entity.playerID,
                                by: entity.playerID,
                                executed: false
                            }
                        };
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
            EHCGMS: this.EHCGMS,
            state: this.state,
            readinessIcons: this.getReadinessIcons(),
            accessToken
        });
    }

    private exitMovementMode(accessToken: AccessToken) {
        this.controlLocks.delete(Enum.KeyCode.X);
        this.gui.clearAll();
        this.gui.updateMainUI('onlyReadinessBar', {
            EHCGMS: this.EHCGMS,
            state: this.state,
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
        await this.playAttackAnimation(attackAction);
    }

    private async playAttackAnimation(aa: AttackAction) {
        // const { using, target, animation } = aa.ability;

        // await target.faceEntity(attacker);

        // const attackAnimation = attacker.playAnimation({
        //     animation,
        //     priority: Enum.AnimationPriority.Action4,
        //     loop: false,
        // });

        // const defendIdleAnimation = target.playAnimation({
        //     animation: "defend",
        //     priority: Enum.AnimationPriority.Action2,
        //     loop: false,
        // });

        // if (!attackAnimation) {
        //     warn("[playAttackAnimation] Attacker animation track not found.");
        //     return;
        // }

        // try {
        //     await this.waitForAnimationMarker(attackAnimation, "Hit");
        //     target.animationHandler?.killAnimation(AnimationType.Idle);

        //     if (isAttackKills(attackAction)) {
        //         defendIdleAnimation?.Stop();
        //         target.playAnimation({
        //             animation: "death-idle",
        //             priority: Enum.AnimationPriority.Idle,
        //             loop: true,
        //         })
        //         const deathAnimation = target.playAnimation({
        //             animation: "death",
        //             priority: Enum.AnimationPriority.Action3,
        //             loop: false,
        //         });
        //     }
        //     else {
        //         defendIdleAnimation?.Stop();
        //         const gotHitAnimation = target.playAnimation({
        //             animation: "defend-hit",
        //             priority: Enum.AnimationPriority.Action3,
        //             loop: false,
        //         });

        //         await this.waitForAnimationEnd(attackAnimation);
        //         if (gotHitAnimation) await this.waitForAnimationEnd(gotHitAnimation);

        //         const transitionTrack = target.playAnimation({
        //             animation: "defend->idle",
        //             priority: Enum.AnimationPriority.Action4,
        //             loop: false,
        //         });

        //         transitionTrack?.Ended.Wait();
        //         target.playAnimation({
        //             animation: "idle",
        //             priority: Enum.AnimationPriority.Idle,
        //             loop: true,
        //         })
        //     }
        // } catch (error) {
        //     warn(`[playAttackAnimation] Error during attack animation: ${error}`);
        // }

        // attacker.playAudio(EntityStatus.Idle);
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