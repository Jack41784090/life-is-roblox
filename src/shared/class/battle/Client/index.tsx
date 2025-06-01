import React from "@rbxts/react";
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import { t } from "@rbxts/t";
import CellSurface from "gui_sharedfirst/components/cell-surface";
import { AccessToken, ActionType, AttackAction, BattleAction, ClientSideConfig, ControlLocks, MoveAction, ResolveAttacksAction, StateState, TILE_SIZE } from "shared/class/battle/types";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE } from "shared/const";
import { serverRemotes, serverRequestRemote } from "shared/remote";
import { promiseWrapper } from "shared/utils";
import Logger from "shared/utils/Logger";
import { GameEvent } from "../Events/EventBus";
import { NetworkService } from "../Network";
import { attackActionRefVerification, clashesVerification, entityMovedEventDataVerification } from "../Network/SyncSystem/veri";
import Pathfinding from "../Pathfinding";
import Entity from "../State/Entity";
import HexCell from "../State/Hex/Cell";
import HexCellGraphics from "../State/Hex/Cell/Graphics";
import { ActiveAbilityState } from "../Systems/CombatSystem/Ability/types";
import { StrikeSequence } from "../Systems/CombatSystem/types";
import BattleAnimationManager from "./AnimationQueue";
import BattleCamera from "./BattleCamera";
import { ClientActionValidator } from "./ClientValidation";
import Graphics from "./Graphics";
import EntityCellGraphicsTuple from "./Graphics/Tuple";
import Gui from './Gui';
import State from "./State";

export default class BattleClient {
    private logger = Logger.createContextLogger("ClientSide");

    private graphicsInitialised: Promise<[StateState]>;
    private gui: Gui;
    private camera: BattleCamera;
    private state: State;
    private graphics: Graphics;
    private animations: BattleAnimationManager;
    private networking: NetworkService;
    private validator: ClientActionValidator;

    private controlLocks: ControlLocks = new Map();

    private constructor(config: ClientSideConfig) {
        this.logger.debug("Creating BattleClient with config:", config);
        const { worldCenter, size, width, height, camera } = config;
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);

        this.camera = new BattleCamera(camera, worldCenter, gridMin, gridMax);
        this.state = new State(config);
        this.networking = new NetworkService();
        this.graphics = new Graphics(
            math.floor(width / 2),
            height,
            size,
            this.state.getGridManager().getGrid()
        );
        this.animations = new BattleAnimationManager();
        this.validator = new ClientActionValidator(this.state);

        // this.setupEventListeners();

        this.gui = Gui.Connect({
            readinessFragments: this.state.getReadinessFragments(),
        });
        this.graphicsInitialised = this.initialiseGraphics();
        this.setupEventListeners();
        this.setupRemoteListeners();
    }

    private setupEventListeners() {
        const eventBus = this.state.getEventBus();
        eventBus.subscribe(GameEvent.TURN_STARTED, async (received_id: unknown) => {
            const verification = t.number(received_id);
            if (!verification) {
                this.logger.error("Invalid ID type for TURN_STARTED event", received_id as defined);
                return;
            }

            await this.graphicsInitialised;
            await this.animations.waitForAllAnimationsToEnd();

            const validateTurnStartIDWithServer = serverRequestRemote.cre()
            validateTurnStartIDWithServer.then(server_id => {
                if (received_id !== server_id) {
                    this.logger.error("Turn ID mismatch", received_id, server_id);
                    this.completeUpdate().then(() => {
                        this.state.getEventBus().emit(GameEvent.TURN_STARTED, server_id);
                    })
                    return;
                }

                if (received_id === Players.LocalPlayer.UserId) {
                    serverRequestRemote.toAct().then(ac => {
                        this.setupInteractiveMode(ac);
                    })
                } else {
                    // Maintain consistent camera view for all players
                    // Camera position is managed separately from UI state
                }
            })
        })
        eventBus.subscribe(GameEvent.TURN_ENDED, async (id: unknown) => {
            const verification = t.number(id);
            if (!verification) {
                this.logger.error("Invalid ID type for TURN_ENDED event", id as defined);
                return;
            }

            await this.graphicsInitialised;
            // verify the entity's state with server
            await this.animations.waitForAllAnimationsToEnd()
            const serverEntityState = await serverRequestRemote.actor(id);
            if (!serverEntityState) return;
            const context = 'in TURN_ENDED after requesting actor';
            const entity = this.state.getEntity(id);
            if (!entity) {
                this.logger.fatal("Actor not found for TURN_ENDED event", id);
                return;
            }
            let localEntityGraphic = this.graphics.getEntityGraphic(entity.playerID);
            let localEntity = this.state.getEntity(id);
            if (!localEntity) {
                this.logger.warn("Entity not found in state", context, id);
                localEntity = this.state.getEntity(id)!; // TODO
                if (!localEntityGraphic) {
                    this.logger.warn("Graphic not found for entity", context, id);
                    localEntityGraphic = this.graphics.setNewEntity(serverEntityState, localEntity.qr)
                }

                this.state.sync({
                    entities: [serverEntityState],
                })
                // this.graphics.moveEntity(localEntity.qr, serverEntityState.qr);
                this.handleMoveAnimation(id, localEntity.qr, serverEntityState.qr);
            }
        })

        eventBus.subscribe(GameEvent.ENTITY_INTEND_MOVE, (data: unknown) => {
            const context = 'in ENTITY_INTEND_MOVE event'
            const veri = entityMovedEventDataVerification(data);
            if (!veri) {
                this.logger.error("Invalid data type for ENTITY_INTEND_MOVE event", data as defined);
                return;
            }
            const { entityId, from, to } = data;
            this.handleMoveAnimation(entityId, from, to);
        })
        // eventBus.subscribe(GameEvent.ENTITY_MOVED, (data) => {
        // })

        eventBus.subscribe(GameEvent.ENTITY_INTEND_ATTACK, (neoClashResults: unknown, attackActionRef: unknown) => {
            const veriNeoClashResult = clashesVerification(neoClashResults);
            if (!veriNeoClashResult) {
                this.logger.error("Invalid data `neoClashResults` type for ENTITY_INTEND_ATTACK event", neoClashResults as defined);
                return;
            }

            const veriAttackActionRef = attackActionRefVerification(attackActionRef);
            if (!veriAttackActionRef) {
                this.logger.error("Invalid data `attackActionRef` type for ENTITY_INTEND_ATTACK event", attackActionRef as defined);
                return;
            }

            // animating clashes
            // this.animating.then(() => {
            //     this.animating = this.handleAnimatingClashes(neoClashResults, attackActionRef).then(() => {
            //         eventBus.emit(GameEvent.ENTITY_ATTACKED, neoClashResults, attackActionRef);
            //     });
            // })
            if (attackActionRef.against === undefined) {
                this.logger.error("Attack action has no target", "in ENTITY_INTEND_ATTACK event", attackActionRef);
                return;
            }
            this.handleAttackAnimation(attackActionRef.by, attackActionRef.against, neoClashResults);
        })

        // eventBus.subscribe(GameEvent.ENTITY_UPDATED, (entityUpdate: unknown) => {
        // })
    }

    private setupRemoteListeners() {
        const eventBus = this.state.getEventBus();
        this.networking.onClientRemote('animate', async (accessToken: AccessToken) => {
            const context = 'client remote called to animate'
            if (!accessToken.action) {
                this.logger.error("Access token has no action", context, accessToken);
                return;
            } if (accessToken.userId === Players.LocalPlayer.UserId) {
                this.logger.debug("local player access token received, assuming animation is done locally already", context, accessToken);
                return;
            }
            this.validateAndCommit(accessToken.action);
            switch (accessToken.action.type) {
                case ActionType.Move:
                    const { by, from, to } = accessToken.action as MoveAction;
                    this.handleMoveAnimation(by, from, to);
                    break;
                case ActionType.Attack:
                    const { by: attacker, against } = accessToken.action as AttackAction;
                    if (!against) {
                        this.logger.error("Attack action has no target", context, accessToken);
                        return;
                    }
                    const clashes = await serverRequestRemote.clashes(accessToken);
                    this.handleAttackAnimation(attacker, against, clashes);
                    break;
                case ActionType.ResolveAttacks:
                    const { by: attacker_, against: against_, results } = accessToken.action as ResolveAttacksAction;
                    if (!against_) {
                        this.logger.error("ResolveAttacks action has no target", context, accessToken);
                        return;
                    }
                    this.handleAttackAnimation(attacker_, against_, results)
                    break;
            }
        });
        this.networking.onClientRemote('turnEnd', (id?: number) => {
            // this.logger.debug("Client received: Turn ended", id);
            eventBus.emit(GameEvent.TURN_ENDED, id);
            // this.camera.enterHOI4Mode();
        });
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
        worldCenter: Vector3,
        width: number;
        height: number;
        client: Player;
    }) {
        if (RunService.IsServer()) throw "ClientSide cannot be created on the server!";
        const cs = new BattleClient({
            ...config,
            camera: Workspace.CurrentCamera as Camera,
            size: TILE_SIZE,
        });
        cs.initialiseInputControl();

        cs.logger.debug("1. Initialise first state update");
        await cs.completeUpdate();

        cs.logger.debug("2. Start Loop")
        cs.state.StartLoop();

        return cs;
    }

    //#region Updates

    private async completeUpdate() {
        // this.logger.debug("Requesting update state and readiness map");
        const stateData = await serverRequestRemote.state();
        this.state.sync(stateData);
        this.gui.forceUpdateMainFrame();
        // this._localTickEntitiesCache = this.state.getEntityManager().getAllEntities();
        await this.graphics.sync(stateData)
        return stateData;
    }

    private initialiseInputControl() {
        UserInputService.InputBegan.Connect((io, gpe) => {
            this.onInputBegan(io, gpe);
        });

        UserInputService.InputChanged.Connect((io, gpe) => {
            this.onInputChanged(io, gpe);
        });
    }

    private initialiseCamera() {
        this.camera.enterHOI4Mode();
    }

    private initialiseGraphics() {
        this.initialiseCamera();
        return Promise.all([
            this.completeUpdate(),
        ]);
    }
    //#endregion

    //#region Animations
    private handleAttackAnimation(attackerId: number, targetId: number, clashes: StrikeSequence[]) {
        const attacker = this.graphics.getEntityGraphic(attackerId);
        const target = this.graphics.getEntityGraphic(targetId);
        if (!attacker || !target) {
            this.logger.error(`Cannot find: `, { attacker, target })
            return;
        }

        this.animations.handleClashes(attacker, target, clashes);
    }

    private handleMoveAnimation(entityId: number, from: Vector2, to: Vector2) {
        // const mover = this.graphics.findEntityG(entityId);
        // const fromWorldLocation = this.graphics.findCellG(from)?.worldPosition();
        // const toWorldLocation = this.graphics.findCellG(to)?.worldPosition();
        // if (!mover || !fromWorldLocation || !toWorldLocation) {
        //     this.logger.error(`Cannot find: `, { mover, fromWorldLocation, toWorldLocation })
        //     return;
        // }

        // this.animations.handleMoveAnimation(mover, fromWorldLocation, toWorldLocation);
        const [promise, resolver] = promiseWrapper(this.graphics.moveEntity(from, to));
        this.animations.queueAnimation({
            name: `handleMoveAnimation of ${entityId} from ${from} to ${to}`,
            promise,
            promise_resolve: resolver,
            timeout: 5,
        })
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

    //#region UI-Related
    private async setupInteractiveMode(accessToken: AccessToken) {
        const localE = await this.localEntity();
        this.controlLocks.set(Enum.KeyCode.X, true);

        // Unified system - all UI components are always displayed
        // The user can interact with all elements simultaneously
        this.gui.forceUpdateMainFrame(
            localE,
            this.getSensitiveCellElements(accessToken)
        );
    }

    private getSensitiveCellElements(accessToken: AccessToken): React.Element {
        const currentGraphicRepresentation = this.graphics.getTuples();
        return <frame key={'SensitiveCells'}>{
            currentGraphicRepresentation.map(t => <CellSurface
                cell={t.cellGraphics}
                onEnter={() => this.handleCellEnter(t)}
                onclick={() => this.handleCellClick(t, accessToken)}
            />)}
        </frame>;
    }

    private async handleCellEnter(tuple: EntityCellGraphicsTuple) {
        const hoveredOverEntity = this.state.getEntity(tuple.cellGraphics.qr);
        const hoveredOverEntityGraphics = tuple.entityGraphics
        const currentActor = this.state.getCurrentActor();
        const currentActorQR = currentActor.qr;
        const currentCell = this.state.getCell(currentActorQR); assert(currentCell, "[handleCellEnter] Current cell is not defined");
        const currentActorGraphics = this.graphics.getEntityGraphic(currentActor.playerID); assert(currentActorGraphics, "[handleCellEnter] Current actor graphics is not defined"); //checkthis

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (currentActor.armed && hoveredOverEntity?.qr && hoveredOverEntityGraphics) {
            currentActorGraphics.faceEntity(hoveredOverEntityGraphics);
            const ability = currentActor.getEquippedAbilitySet()[currentActor.armed];
            const glowHexCells = [] as HexCellGraphics[];
            if (ability) {
                if (this.state.getCell(hoveredOverEntity.qr)?.isWithinRangeOf(currentCell, ability.range)) {
                    mouse.Icon = DECAL_WITHINRANGE;
                }
                else {
                    mouse.Icon = DECAL_OUTOFRANGE;
                }
                const inrange = currentCell.findCellsWithinRange(ability.range);
                inrange
                    .mapFiltered((cell: HexCell) => this.graphics.getTupleAtPosition(cell.qr()))
                    .forEach((t: EntityCellGraphicsTuple) => glowHexCells.push(t.cellGraphics))
            }
            else {
                mouse.Icon = '';
            }
            return this.gui.mountOrUpdateGlow(glowHexCells);
        }
        // 1. Hovering over an empty cell / CRE has no ability selected
        else {
            mouse.Icon = ''
            const pf = new Pathfinding({
                grid: this.state.getGridState(),
                start: currentCell.qr(),
                dest: tuple.cellGraphics.qr,
                // limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.gui.mountOrUpdateGlow(path.mapFiltered((qr) => this.graphics.getTupleAtPosition(qr).cellGraphics));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.get('pos') - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

    }

    private handleCellClick(clickedtuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        // this.logger.debug("Cell clicked", clickedtuple);
        if (clickedtuple.entityGraphics) {
            // this.logger.debug("State", this.state);
            const clickedOnEntity = this.state.getEntity(clickedtuple.cellGraphics.qr); assert(clickedOnEntity, "Clicked on entity is not defined");
            this.clickedOnEntity(clickedOnEntity, accessToken);
        }
        else {
            this.clickedOnEmptyCell(clickedtuple, accessToken);
        }
    }
    private async clickedOnEmptyCell(emptyTuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        // this.logger.debug("Clicked on empty cell", emptyTuple);

        const start = this.state.getCurrentActor().qr;
        const dest = emptyTuple.cellGraphics.qr;

        // set action
        accessToken.action = {
            type: ActionType.Move,
            executed: false,
            by: accessToken.userId,
            to: dest,
            from: start,
        } as MoveAction;

        // commit action to server
        const ac = await this.submitAction(accessToken.action);

        if (ac) {
            // emit event to this client
            this.state.getEventBus().emit(GameEvent.ENTITY_INTEND_MOVE, {
                entityId: accessToken.userId,
                from: start,
                to: dest,
            })

            // commit action to local state
            this.validateAndCommit(accessToken.action);

            const waitForMoveAnimation = await this.animations.waitForAllAnimationsToEnd(); const localE = await this.localEntity();
            if (localE.get('pos') >= 75) {
                // this.logger.debug("Local entity is still ready");

                // Request new access token for subsequent actions
                const newAccessToken = await serverRequestRemote.toAct();
                if (newAccessToken.allowed) {
                    // Properly re-enable interaction with the new token
                    this.setupInteractiveMode(newAccessToken);
                }
            }
        }
        else {
            this.logger.warn("Action not allowed", ac);
            this.setupInteractiveMode(accessToken);
        }
    }
    //#endregion

    //#region Combat
    private async clickedOnEntity(clickedOn: Entity, accessToken: AccessToken) {
        // this.logger.debug("Clicked on entity", clickedOn);
        const cre = this.state.getCurrentActor();
        if (!cre.armed) {
            this.logger.warn("[clickedOnEntity] Current entity is not armed");
            return;
        }

        // set temp attack action
        const iability = cre.getEquippedAbilitySet()[cre.armed];
        const attackAction = {
            type: ActionType.Attack,
            ability: {
                ...iability,
                using: cre,
                target: clickedOn.state(),
            } as unknown as ActiveAbilityState,
            by: cre.playerID,
            against: clickedOn.playerID,
            executed: false,
        } as AttackAction;
        accessToken.action = attackAction;

        // resolve attack using temp attack action
        const clashes = await serverRequestRemote.clashes(accessToken);

        // set action back to resolveAttacks
        const resolveAction: ResolveAttacksAction = {
            ...attackAction,
            type: ActionType.ResolveAttacks,
            results: clashes,
        }
        accessToken.action = resolveAction;

        // commit action to server
        this.submitAction(accessToken.action);

        // emit event to this client
        this.state.getEventBus().emit(GameEvent.ENTITY_INTEND_ATTACK, clashes, attackAction);        // commit action to local state
        this.validateAndCommit(resolveAction); const waitForMoveAnimation = await this.animations.waitForAllAnimationsToEnd();
        // this.logger.debug("Animations ended", waitForMoveAnimation!);

        const localEntity = await this.localEntity();
        // this.logger.debug("Local entity pos", localEntity.get('pos'));
        if (localEntity.get('pos') >= 75) {
            // this.logger.debug("Local entity is still ready");

            // Request new access token for subsequent actions
            const newAccessToken = await serverRequestRemote.toAct();
            if (newAccessToken.allowed) {
                // Properly re-enable interaction with the new token
                this.setupInteractiveMode(newAccessToken);
            }
        }
    }

    //#endregion
    //#endregion

    //#region Server Requests
    private validateLocalAction(action: BattleAction): boolean {
        return this.validator.validateLocalAction(action);
    }

    private async submitAction(action: BattleAction, refreshWhenFail = true): Promise<boolean> {
        if (!this.validateLocalAction(action)) {
            this.logger.warn("Action failed local validation and was not sent to server");
            return false;
        } try {
            const accessToken = await serverRequestRemote.toAct();
            if (!accessToken.allowed) {
                this.logger.warn("Server denied action request");
                if (refreshWhenFail) {
                    this.setupInteractiveMode(accessToken);
                    await this.completeUpdate();
                }
                return false;
            }

            const result = await serverRequestRemote.act({
                token: accessToken.token!,
                action: action,
                allowed: accessToken.allowed,
                userId: Players.LocalPlayer.UserId,
            });

            return result.allowed;
        } catch (e) {
            this.logger.error("Error submitting action to server:", e as defined);
            return false;
        }
    }

    async endTurn(): Promise<boolean> {
        try {
            const accessToken = await serverRequestRemote.toAct();

            if (!accessToken.allowed) {
                this.logger.warn("Server denied turn end request");
                return false;
            }

            serverRemotes.end({
                token: accessToken.token!,
                allowed: accessToken.allowed,
                userId: Players.LocalPlayer.UserId,
                action: undefined
            });

            return true;
        } catch (e) {
            this.logger.error("Error ending turn:", e as defined);
            return false;
        }
    }
    async endTurnWithAccessToken(accessToken: AccessToken): Promise<boolean> {
        try {
            serverRemotes.end({
                token: accessToken.token!,
                allowed: accessToken.allowed,
                userId: Players.LocalPlayer.UserId,
                action: undefined
            });

            return true;
        } catch (e) {
            this.logger.error("Error ending turn:", e as defined);
            return false;
        }
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
                            // Update the unified UI - all components remain visible
                            // this.setupInteractiveMode()
                        }
                    })
                };
                break;
        }
    }
    private onInputChanged(io: InputObject, gpe: boolean) {
        if (gpe) return;

        // Handle mouse wheel zoom
        if (io.UserInputType === Enum.UserInputType.MouseWheel) {
            // this.camera.handleZoom(-io.Position.Z); // Negative for natural scroll direction

            // Update focused character for potential mode switching
            this.localEntity().then(entity => {
                const entityGraphics = this.graphics.getEntityGraphic(entity.playerID);
                if (entityGraphics) {
                    // this.camera.setFocusedCharacter(entityGraphics);
                }
            });
        }
    }
    //#endregion

    /**
     * Validates an action locally and commits it to the state if valid
     */
    private validateAndCommit(action: BattleAction | undefined): boolean {
        if (!action) {
            this.logger.warn("Cannot validate and commit undefined action");
            return false;
        }

        if (!this.validateLocalAction(action)) {
            this.logger.warn("Action failed local validation and was not committed");
            return false;
        }

        this.state.commit(action);
        return true;
    }
}