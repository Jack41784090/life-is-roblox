import { atom, Atom } from "@rbxts/charm";
import { Players, RunService, UserInputService } from "@rbxts/services";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClientSideConfig, ControlLocks, EntityStatus, MoveAction, NeoClashResult, PlayerID, ReadinessIcon, StateState, TILE_SIZE } from "shared/class/battle/types";
import { GuiTag } from "shared/const";
import remotes from "shared/remote";
import { isAttackKills } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../Events/EventBus";
import { NetworkService } from "../Network/NetworkService";
import { EntityMovedEventData } from "../Network/SyncSystem";
import ClientGameState from '../State/ClientGameState';
import Entity from "../State/Entity";
import { AnimationType } from "../State/Entity/Graphics/AnimationHandler";
import BattleCam from "./BattleCamera";
import EntityHexCellGraphicsMothership from "./EHCG/Mothership";
import BattleGui from "./Gui";

export default class ClientSide {
    private logger = Logger.createContextLogger("ClientSide");
    private graphicsInitialised: Promise<[StateState]>;
    private eventBus: EventBus;
    private remotees: Array<() => void> = [];
    private animating: Promise<unknown> = Promise.resolve();

    public gui: BattleGui;
    public camera: BattleCam;

    private state: ClientGameState;
    private EHCGMS: EntityHexCellGraphicsMothership;

    private controlLocks: ControlLocks = new Map();

    private readinessIconMap: Record<PlayerID, Atom<number>> = {};
    private networking: NetworkService = new NetworkService();

    private constructor({ worldCenter, size, width, height, camera }: ClientSideConfig) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);

        // Create the EventBus for client-side event handling
        this.eventBus = new EventBus();

        this.state = new ClientGameState({
            width,
            worldCenter,
        });

        this.EHCGMS = new EntityHexCellGraphicsMothership(
            math.floor(width / 2),
            height,
            size,
            this.state.getGridManager().getGrid()
        );

        this.setupRemoteListeners();
        this.setupEventListeners();

        this.gui = BattleGui.Connect(this.getReadinessIcons());
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
            cs.initialiseInputControl();
            return cs;
        }
    }

    //#region Remote Communications
    private handleActionMenuMount = async () => {
        this.logger.debug("Mounting action menu", "BattleClient");
        try {
            const entity = await this.localEntity(); print(`Entity: ${entity}`);
            if (entity) {
                this.gui.mountActionMenu(this.getCharacterMenuActions(entity));
            }
        } catch (err) {
            this.logger.error(`Failed to handle action menu mount: ${err}`, "BattleClient");
        }
    }

    private handleOtherPlayersTurn = () => {
        this.gui.mountOtherPlayersTurnGui();
    }

    private handleForceUpdate = () => {
        this.requestUpdateStateAndReadinessMap().then(stateData => {
            // Emit events based on the updated state
            // This bridges the gap between network updates and the event system

            // Emit grid updated event
            if (stateData.grid) {
                this.eventBus.emit(GameEvent.GRID_UPDATED, stateData.grid);
            }

            // Emit entity updated events for each entity
            if (stateData.teams) {
                for (const team of stateData.teams) {
                    for (const member of team.members) {
                        const entity = this.state.getEntityManager().getEntity(member.playerID);
                        if (entity) {
                            this.eventBus.emit(GameEvent.ENTITY_UPDATED, entity);
                        }
                    }
                }
            }

            // Emit turn started event if CRE is defined
            if (stateData.cre) {
                const cre = this.state.getEntity(stateData.cre);
                if (cre) {
                    this.eventBus.emit(GameEvent.TURN_STARTED, cre);
                }
            }
        }).catch(err => {
            this.logger.error(`Failed to update state: ${err}`, "BattleClient");
        });
    }

    private handleCameraHoi4Mode = () => {
        return this.camera.enterHOI4Mode();
    }

    private handleEntityChosen = async () => {
        try {
            this.logger.debug("Chosen: waiting for animating to end", "BattleClient");
            await this.animating;

            this.logger.debug("Getting local entity", "BattleClient");
            const entity = await this.localEntity();
            this.exitMovement();

            const entityGraphics = this.EHCGMS.findEntityG(entity.playerID) ??
                this.EHCGMS.positionNewPlayer(entity.state(), entity.state().qr!);

            await this.camera.enterCharacterCenterMode(entityGraphics);

            if (entity) {
                this.gui.mountActionMenu(this.getCharacterMenuActions(entity));
            }
        } catch (err) {
            this.logger.error(`Failed to handle entity chosen: ${err}`, "BattleClient");
        }
    }

    private handleAnimationRequest(ac: AccessToken) {
        if (!ac.action) {
            this.logger.warn("No action found in animate call", "BattleClient");
            return;
        }
        this.logger.debug("Received action: " + ac.action.type, "BattleClient");
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

    private async handleAnimatingClashes(clashes: NeoClashResult[], attackActionRef: AttackAction): Promise<void> {
        this.logger.debug("Animating clashes", clashes, "BattleClient");
        await this.animating;
        const attacker = this.EHCGMS.findEntityG(attackActionRef.by);
        assert(attacker, "Attacker not found in EHCGMS");
        assert(attackActionRef.against !== undefined, "Attack action has invalid target id");
        const defender = this.EHCGMS.findEntityG(attackActionRef.against);
        for (const clash of clashes) {
            const { weapon, target, result } = clash;
            const defenceSuccessful = result.fate === 'Miss' || result.fate === 'Cling';
            await this.playAttackAnimation({
                ability: attackActionRef.ability,
                type: ActionType.Attack,
                by: attackActionRef.by,
                against: attackActionRef.against,
                clashResult: {
                    damage: result.roll,
                    u_damage: result.roll,
                    fate: result.fate,
                    roll: result.roll,
                    defendAttemptSuccessful: defenceSuccessful,
                    defendAttemptName: result.fate,
                    defendReactionUpdate: {},
                },
                executed: false,
            })
        }
    }

    private handleMoveActionAnimationRequest(ma: MoveAction) {
        const cre = this.state.getEntityManager().getEntity(ma.by);
        assert(cre, "Current entity is not defined");

        const path = this.state.getGridManager().findPath(ma.from, ma.to, cre.get('pos'));
        if (!path) {
            this.logger.warn("No path found for move action", ma);
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

    private async requestUpdateStateAndReadinessMap() {
        const stateData = await this.networking.requestGameState();
        await this.state.syncWithServerState(stateData);
        await this.animating;
        await this.EHCGMS.fullSync(stateData)
        await this.updateReadinessMap(stateData);
        return stateData;
    }

    private updateReadinessMap(state: StateState) {
        state.teams.forEach(t => {
            t.members.forEach(e => {
                const currentAtom = this.readinessIconMap[e.playerID]
                if (currentAtom) {
                    this.logger.debug(`readinessicon: ${currentAtom()} => ${e.pos}`, "BattleClient");
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
                this.logger.warn(`Entity not found for player ${p.UserId}`, "BattleClient");
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
        this.logger.debug("Readiness Icons", readinessIcons, "BattleClient");
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
                            this.logger.warn(`${Players.LocalPlayer.Name} has received no access token`, "BattleClient");
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
        this.logger.debug("Entering movement mode", "BattleClient");
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
        await this.animating;
        this.logger.debug("Playing attack animation", aa, "BattleClient");
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
            this.logger.warn("[playAttackAnimation] Attacker animation track not found.", "BattleClient");
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
            this.logger.error(`[playAttackAnimation] Error during attack animation: ${error}`, "BattleClient");
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
        this.logger.debug("TRACK", track?.Name, "Waiting end", track, "BattleClient");
        if (!track) return;
        return new Promise((resolve) => {
            track.Ended.Once(() => {
                this.logger.debug("TRACK", track?.Name, "Animation ended", track, "BattleClient");
                resolve();
            });
        });
    }
    //#endregion

    //#region Event Listeners

    /**
     * Set up event listeners for game state changes from both network events and local state changes
     */
    private setupEventListeners(): void {
        // Listen for entity movement events from the local event bus
        this.eventBus.subscribe(GameEvent.ENTITY_MOVED, (data: unknown) => {
            const movedData = data as EntityMovedEventData;
            this.logger.debug(`Client received entity moved event: Entity ${movedData.entityId} moved from ${movedData.from} to ${movedData.to}`, "BattleClient");

            // Update the visual representation of the entity
            const entity = this.state.getEntityManager().getEntity(movedData.entityId);
            if (entity) {
                const entityGraphics = this.EHCGMS.findEntityG(movedData.entityId);
                if (entityGraphics) {
                    const destCellG = this.EHCGMS.findCellG(movedData.to);
                    if (destCellG) {
                        // If we have a path, use it, otherwise move directly
                        const path = this.state.getGridManager().findPath(movedData.from, movedData.to);
                        if (path) {
                            const cellGPath = path.map(qr => this.EHCGMS.findCellG(qr));
                            this.animating = entityGraphics.moveToCell(destCellG, cellGPath);
                        } else {
                            this.animating = entityGraphics.moveToCell(destCellG, [destCellG]);
                        }
                    }
                }
            }
        });

        // Listen for entity updated events
        this.eventBus.subscribe(GameEvent.ENTITY_UPDATED, (entity: unknown) => {
            const updatedEntity = entity as Entity;
            this.logger.debug(`Client received entity updated event: Entity ${updatedEntity.name} (${updatedEntity.playerID}) updated`, "BattleClient");

            // Update the readiness icon if this entity has one
            const readinessIcon = this.readinessIconMap[updatedEntity.playerID];
            if (readinessIcon) {
                readinessIcon(updatedEntity.get('pos'));
                this.logger.debug(`Updated readiness icon for ${updatedEntity.name} to ${updatedEntity.get('pos')}`, "BattleClient");
            }

            // Update visual representation if needed
            const entityGraphics = this.EHCGMS.findEntityG(updatedEntity.playerID);
            if (entityGraphics) {
                // Additional visual updates can be performed here 
                // (e.g., health bar updates, status effects, etc.)
            }
        });

        // Listen for grid update events
        this.eventBus.subscribe(GameEvent.GRID_UPDATED, (gridState: unknown) => {
            this.logger.debug("Client received grid updated event", "BattleClient");

            // Sync grid visuals with the updated state
            this.EHCGMS.syncGrid(this.state.getGridState());
        });

        // Listen for turn started events
        this.eventBus.subscribe(GameEvent.TURN_STARTED, (entity: unknown) => {
            const turnEntity = entity as Entity;
            this.logger.debug(`Client received turn started event for entity: ${turnEntity.name} (${turnEntity.playerID})`, "BattleClient");

            // Check if it's the local player's turn
            if (turnEntity.playerID === Players.LocalPlayer.UserId) {
                this.logger.debug("It's local player's turn!", "BattleClient");
                this.handleEntityChosen();
            } else {
                this.logger.debug("It's another player's turn", "BattleClient");
                this.handleOtherPlayersTurn();
            }
        });
    }

    private setupRemoteListeners() {
        const network = this.networking;
        this.remotees.push(
            network.onForceUpdate(this.handleForceUpdate),
            network.onActionAnimate((at) => this.handleAnimationRequest(at)),
            network.onActionMenuMount(this.handleActionMenuMount),
            network.onOtherPlayersTurn(this.handleOtherPlayersTurn),
            network.onCameraHoi4Mode(this.handleCameraHoi4Mode),
            network.onEntityChosen(this.handleEntityChosen),
            network.onAnimateClashes((clashes, attackAction) => this.handleAnimatingClashes(clashes, attackAction)),
        );
    }
    //#endregion
}