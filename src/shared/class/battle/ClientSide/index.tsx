import { atom, Atom } from "@rbxts/charm";
import { Players, RunService, UserInputService } from "@rbxts/services";
import { GuiTag } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClientSideConfig, ControlLocks, EntityStatus, MoveAction, PlayerID, ReadinessIcon, StateState, TILE_SIZE } from "shared/types/battle-types";
import { isAttackKills, warnWrongSideCall } from "shared/utils";
import ClientGameState from '../State/ClientGameState';
import Entity from "../State/Entity";
import { AnimationType } from "../State/Entity/Graphics/AnimationHandler";
import BattleCam from "./BattleCamera";
import EntityHexCellGraphicsMothership from "./EHCG/Mothership";
import Gui from "./Gui";

export default class ClientSide {
    private graphicsInitialised: Promise<[StateState]>;

    private remotees: Array<() => void> = [];
    private animating: Promise<unknown> = Promise.resolve();

    public gui: Gui;
    public camera: BattleCam;

    private state: ClientGameState;
    private EHCGMS: EntityHexCellGraphicsMothership;

    private controlLocks: ControlLocks = new Map();

    private readinessIconMap: Record<PlayerID, Atom<number>> = {};

    private constructor({ worldCenter, size, width, height, camera }: ClientSideConfig) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);

        this.state = new ClientGameState({
            width,
            worldCenter,
            teamMap: {},
        });

        this.EHCGMS = new EntityHexCellGraphicsMothership(
            math.floor(width / 2),
            height,
            size,
            this.state.getGridManager().getGrid()
        );

        this.gui = Gui.Connect(this.getReadinessIcons());
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
            remotes.battle.ui.mount.actionMenu.connect(() => this.handleActionMenuMount()),
            remotes.battle.ui.mount.otherPlayersTurn.connect(() => this.handleOtherPlayersTurn()),
            remotes.battle.forceUpdate.connect(() => this.handleForceUpdate()),
            remotes.battle.animate.connect((ac) => this.handleAnimationRequest(ac)),
            remotes.battle.camera.hoi4.connect(() => this.handleCameraHoi4Mode()),
            remotes.battle.chosen.connect(() => this.handleEntityChosen()),
        ];
    }

    private handleActionMenuMount = async () => {
        try {
            const entity = await this.localEntity();
            if (entity) {
                this.gui.mountActionMenu(this.getCharacterMenuActions(entity));
            }
        } catch (err) {
            warn(`Failed to handle action menu mount: ${err}`);
        }
    }

    private handleOtherPlayersTurn = () => {
        this.gui.mountOtherPlayersTurnGui();
    }

    private handleForceUpdate = () => {
        this.requestUpdateStateAndReadinessMap().catch(err => {
            warn(`Failed to update state: ${err}`);
        });
    }

    private handleCameraHoi4Mode = () => {
        return this.camera.enterHOI4Mode();
    }

    private handleEntityChosen = async () => {
        try {
            print("Chosen: waiting for animating to end");
            await this.animating;

            print("Getting local entity");
            const entity = await this.localEntity();
            this.exitMovement();

            const entityGraphics = this.EHCGMS.findEntityG(entity.playerID) ??
                this.EHCGMS.positionNewPlayer(entity.state(), entity.state().qr!);

            await this.camera.enterCharacterCenterMode(entityGraphics);

            if (entity) {
                this.gui.mountActionMenu(this.getCharacterMenuActions(entity));
            }
        } catch (err) {
            warn(`Failed to handle entity chosen: ${err}`);
        }
    }

    private handleAnimationRequest(ac: AccessToken) {
        if (!ac.action) {
            warn("No action found in animate call", ac);
            return;
        }
        print("Received action", ac.action);
        switch (ac.action.type) {
            case ActionType.Attack:
                const aa = ac.action as AttackAction; assert(aa.clashResult, "Clash result not found in attack action");
                this.handleAttackActionAnimationRequest(aa);
                break;
            case ActionType.Move:
                const ma = ac.action as MoveAction;
                this.handleMoveActionAnimationRequest(ma);
                break;
        }
    }

    private handleMoveActionAnimationRequest(ma: MoveAction) {
        const cre = this.state.getEntityManager().getEntity(ma.by);
        assert(cre, "Current entity is not defined");

        const path = this.state.getGridManager().findPath(ma.from, ma.to, cre.get('pos'));
        if (!path) {
            warn("No path found for move action", ma);
            return;
        }

        const destCellG = this.EHCGMS.findCellG(ma.to);
        const cellGPath = path.map(qr => this.EHCGMS.findCellG(qr));
        const creG = this.EHCGMS.findEntityG(ma.from);
        this.animating = creG.moveToCell(destCellG, cellGPath);
    }

    private handleAttackActionAnimationRequest(aa: AttackAction) {
        this.animating = this.playAttackAnimation(aa);
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
        await this.animating;
        this.EHCGMS.syncTeams(r);
        return r;
    }

    private async requestUpdateGrid() {
        const r = await remotes.battle.requestSync.map();
        this.state.sync({
            grid: r,
        })
        await this.animating;
        this.EHCGMS.syncGrid(r);
        return r;
    }

    private async requestUpdateStateAndReadinessMap() {
        const stateData = await remotes.battle.requestSync.state();

        this.state.syncWithServerState(stateData);

        await this.animating;
        this.EHCGMS.syncTeams(stateData.teams);
        this.EHCGMS.syncGrid(stateData.grid);
        this.updateReadinessMap(stateData);

        return stateData;
    }

    private updateReadinessMap(state: StateState) {
        state.teams.forEach(t => {
            t.members.forEach(e => {
                const currentAtom = this.readinessIconMap[e.playerID]
                if (currentAtom) {
                    print(`readinessicon: ${currentAtom()} => ${e.pos}`)
                    currentAtom(e.pos);
                }
                else {
                    this.readinessIconMap[e.playerID] = atom(e.pos);
                }
            })
        })
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
            this.requestUpdateStateAndReadinessMap(),
        ]);
    }
    //#endregion

    //#region Get
    private getReadinessIcons() {
        const crMap: Record<PlayerID, Atom<number>> = this.readinessIconMap;
        const state = this.state;
        const players = state.getAllPlayers();
        for (const p of players) {
            const e = state.getEntityManager().getEntity(p.UserId);
            if (e) {
                crMap[e.playerID] = crMap[e.playerID] ?? atom(e.get('pos'))
            }
            else {
                warn(`Entity not found for player ${p.UserId}`);
            }
        }
        const readinessIcons: ReadinessIcon[] = [];
        for (const [playerID, readiness] of pairs(crMap)) {
            readinessIcons.push({
                playerID,
                iconUrl: '',
                readiness
            })
        }
        print("Readiness Icons", readinessIcons);
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
                    remotes.battle.requestToAct().then(async accessToken => {
                        if (!accessToken.token) {
                            warn(`${Players.LocalPlayer.Name} has received no access token`);
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
        print("Entering movement mode");
        const localE = await this.localEntity()

        this.controlLocks.set(Enum.KeyCode.X, true);

        this.gui.unmountAndClear(GuiTag.ActionMenu);
        this.gui.mountAbilitySlots(localE);

        this.gui.updateMainUI('withSensitiveCells', {
            EHCGMS: this.EHCGMS,
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
        print("Playing attack animation", aa);
        const { animation } = aa.ability;
        const attacker = this.EHCGMS.findEntityG(aa.by);
        const attackerAnimationHandler = attacker.animationHandler;
        assert(aa.against !== undefined, "attack action has invalid target id");

        const target = this.EHCGMS.findEntityG(aa.against);
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
            warn("[playAttackAnimation] Attacker animation track not found.");
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
    private async waitForAnimationEnd(track?: AnimationTrack): Promise<void> {
        print("TRACK", track?.Name, "Waiting end", track);
        if (!track) return;
        return new Promise((resolve) => {
            track.Ended.Once(() => {
                print("TRACK", track?.Name, "Animation ended", track);
                resolve();
            });
        });
    }
    //#endregion
}