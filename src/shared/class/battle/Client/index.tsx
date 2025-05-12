import { atom, Atom } from "@rbxts/charm";
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClientSideConfig, ControlLocks, EntityStatus, PlayerID, ReadinessIcon, StateState, TILE_SIZE } from "shared/class/battle/types";
import { GuiTag } from "shared/const";
import { isAttackKills } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus } from "../Events/EventBus";
import { NetworkService } from "../Network/NetworkService";
import Entity from "../State/Entity";
import { AnimationType } from "../State/Entity/Graphics/AnimationHandler";
import BattleCamera from "./BattleCamera";
import Graphics from "./Graphics/Mothership";
import Gui from './Gui';
import State from "./State";

export default class BattleClient {
    private logger = Logger.createContextLogger("ClientSide");

    private graphicsInitialised: Promise<[StateState]>;
    private animating: Promise<unknown> = Promise.resolve();

    private eventBus: EventBus;
    private gui: Gui;
    private camera: BattleCamera;
    private state: State;
    private graphics: Graphics;

    private networking: NetworkService;

    private controlLocks: ControlLocks = new Map();

    private constructor(config: ClientSideConfig) {
        const { worldCenter, size, width, height, camera } = config;
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCamera(camera, worldCenter, gridMin, gridMax);
        this.eventBus = new EventBus();
        this.state = new State(config);
        this.networking = new NetworkService();
        this.graphics = new Graphics(
            math.floor(width / 2),
            height,
            size,
            this.state.getGridManager().getGrid()
        );

        // this.setupEventListeners();

        this.gui = Gui.Connect({
            eventBus: this.eventBus,
            networkService: this.networking,
        });
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
        camera: BattleCamera,
        worldCenter: Vector3,
        width: number;
        height: number;
        client: Player;
    }) {
        if (RunService.IsServer()) throw "ClientSide cannot be created on the server!";
        // Client-side Creation
        const cs = new BattleClient({
            ...config,
            camera: Workspace.CurrentCamera as Camera,
            size: TILE_SIZE,
        });
        cs.initialiseInputControl();
        return cs;
    }

    //#region Updates

    private async requestUpdateStateAndReadinessMap() {
        this.logger.debug("Requesting update state and readiness map");
        const stateData = await this.networking.requestGameState();
        await this.state.sync(stateData);
        this._localTickEntitiesCache = this.state.getEntityManager().getAllEntities();
        await this.graphics.sync(stateData)
        return stateData;
    }

    private initialiseInputControl() {
        UserInputService.InputBegan.Connect((io, gpe) => {
            this.onInputBegan(io, gpe);
        })
    }

    private initialiseCamera() {
        this.camera.enterHOI4Mode();
    }

    private initialiseGraphics() {
        this.initialiseCamera();
        return Promise.all([
            this.requestUpdateStateAndReadinessMap(),
        ]);
    }
    //#endregion

    //#region Get
    private getReadinessIcons() {
        const crMap: Record<PlayerID, Atom<number>> = this.turnSystem.getReadinessMap();
        const state = this.state;
        const players = state.getAllPlayers();
        for (const p of players) {
            const e = state.getEntityManager().getEntity(p.UserId);
            if (e) {
                crMap[e.playerID] = crMap[e.playerID] ?? atom(e.get('pos'))
            }
            else {
                this.logger.warn(`Entity not found for player ${p.UserId}`);
            }
        }
        const readinessIcons: ReadinessIcon[] = [];
        for (const [playerID, readiness] of pairs(crMap)) {
            readinessIcons.push({
                playerID,
                iconUrl: this.state.getEntity(playerID)?.stats.id ?? '',
                readiness
            })
        }
        this.logger.debug("Readiness Icons", readinessIcons);
        return readinessIcons;
    }
    //#endregion

    //#region Entity Management
    private async localEntity(): Promise<Entity> {
        const localPlayer = Players.LocalPlayer;
        await this.graphicsInitialised;
        const e = this.state.getEntityManager().getEntity(localPlayer.UserId);
        assert(e, "Local entity not found");
        return e;
    }
    //#endregion

    //#region UI Transitions

    public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: () => {
                    this.networking.requestToAct().then(async accessToken => {
                        if (!accessToken.token) {
                            this.logger.warn(`${Players.LocalPlayer.Name} has received no access token`);
                            return;
                        }
                        const newAccessToken = {
                            ...accessToken,
                            action: {
                                type: ActionType.Move,
                                to: entity.playerID,
                                by: entity.playerID,
                                executed: false
                            }
                        };
                        this.camera.enterHOI4Mode();
                        this.enterMovement(newAccessToken);
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
    private async returnToSelections() {
        this.exitMovement()
        // await this.camera.enterCharacterCenterMode()
        await this.localEntity().then(e => {
            this.camera.enterCharacterCenterMode().then(() => {
                this.gui.mountActionMenu(this.getCharacterMenuActions(e));
            })
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
    private async enterMovement(accessToken: AccessToken) {
        this.logger.debug("Entering movement mode");
        const localE = await this.localEntity()

        this.controlLocks.set(Enum.KeyCode.X, true);

        this.gui.unmountAndClear(GuiTag.ActionMenu);
        this.gui.mountAbilitySlots(localE);

        this.gui.updateMainUI('withSensitiveCells', {
            EHCGMS: this.graphics,
            state: this.state,
            readinessIcons: this.getReadinessIcons(),
            accessToken
        });
    }

    private exitMovement() {
        this.controlLocks.delete(Enum.KeyCode.X);
        this.gui.clearAll();
        this.gui.updateMainUI('onlyReadinessBar', {
            readinessIcons: this.getReadinessIcons(),
        });
    }

    //#endregion

    //#region Inputs

    private onInputBegan(io: InputObject, gpe: boolean) {
        if (!this.controlLocks.get(io.KeyCode)) {
            // play "invalid input" audio
            return;
        }

        switch (io.KeyCode) {
            case Enum.KeyCode.X:
                if (!gpe) {
                    this.controlLocks.delete(Enum.KeyCode.X);
                    this.localEntity().then(e => {
                        this.controlLocks.set(Enum.KeyCode.X, true);
                        if (e) {
                            this.returnToSelections();
                        }
                    })
                };
                break;
        }
    }
    //#endregion

    //#region Animations

    private async playAttackAnimation(aa: AttackAction) {
        await this.animating;
        this.logger.debug("Playing attack animation", aa);
        const { animation } = aa.ability;
        const attacker = this.graphics.findEntityG(aa.by);
        const attackerAnimationHandler = attacker.animationHandler;
        assert(aa.against !== undefined, "attack action has invalid target id");

        const target = this.graphics.findEntityG(aa.against);
        const targetAnimationHandler = target.animationHandler;

        await target.faceEntity(attacker);
        const attackAnimation = attacker.playAnimation(
            AnimationType.Attack,
            {
                animation,
                priority: Enum.AnimationPriority.Action4,
                loop: false,
            });
        const defendIdleAnimation = target.playAnimation(
            AnimationType.Defend,
            {
                animation: "defend",
                priority: Enum.AnimationPriority.Action2,
                loop: false,
            });

        if (!attackAnimation) {
            this.logger.warn("[playAttackAnimation] Attacker animation track not found.");
            return;
        }

        try {

            // 1. Wait for the attack animation to reach the "Hit" marker.
            await this.waitForAnimationMarker(attackAnimation, "Hit");

            // 2. Indicate the damage dealt to the target.
            target.createClashresultIndicators(aa.clashResult);

            // 3. Play the appropriate animation based on the outcome of the attack.
            targetAnimationHandler.killAnimation(AnimationType.Idle);
            targetAnimationHandler.killAnimation(AnimationType.Defend);

            if (isAttackKills(aa)) {
                const deathPoseIdleAnimation = target.playAnimation(
                    AnimationType.Idle,
                    {
                        animation: "death-idle",
                        priority: Enum.AnimationPriority.Idle,
                        loop: true,
                    })
                const deathAnimation = target.playAnimation(
                    AnimationType.Hit,
                    {
                        animation: "death",
                        priority: Enum.AnimationPriority.Action3,
                        loop: false,
                    });

                return this.waitForAnimationEnd(deathAnimation);
            }
            else {
                const gotHitAnimation = target.playAnimation(
                    AnimationType.Hit,
                    {
                        animation: "defend-hit",
                        priority: Enum.AnimationPriority.Action3,
                        loop: false,
                    });

                await this.waitForAnimationEnd(attackAnimation);
                await this.waitForAnimationEnd(gotHitAnimation);

                const transitionTrack = target.playAnimation(
                    AnimationType.Transition,
                    {
                        animation: "defend->idle",
                        priority: Enum.AnimationPriority.Action4,
                        loop: false,
                    });
                const refreshedIdleAnimation = target.playAnimation(
                    AnimationType.Idle,
                    {
                        animation: "idle",
                        priority: Enum.AnimationPriority.Idle,
                        loop: true,
                    })

                return this.waitForAnimationEnd(transitionTrack);
            }
        }
        catch (error) {
            this.logger.error(`[playAttackAnimation] Error during attack animation: ${error}`);
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
    private async waitForAnimationEnd(track?: AnimationTrack): Promise<void> {
        this.logger.debug("TRACK", track?.Name, "Waiting end", track);
        if (!track) return;
        return new Promise((resolve) => {
            track.Ended.Once(() => {
                this.logger.debug("TRACK", track?.Name, "Animation ended", track);
                resolve();
            });
        });
    }
    //#endregion

    //#region Gameplay Loop

}