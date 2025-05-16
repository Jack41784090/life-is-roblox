import React from "@rbxts/react";
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import { t } from "@rbxts/t";
import CellSurface from "gui_sharedfirst/components/cell-surface";
import { AccessToken, ActionType, AttackAction, CharacterActionMenuAction, CharacterMenuAction, ClientSideConfig, ControlLocks, EntityStatus, MoveAction, PlayerID, ReadinessIcon, StateState, TILE_SIZE } from "shared/class/battle/types";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag } from "shared/const";
import { serverRemotes, serverRequestRemote } from "shared/remote";
import { isAttackKills } from "shared/utils";
import Logger from "shared/utils/Logger";
import { GameEvent } from "../Events/EventBus";
import { NetworkService } from "../Network";
import { entityMovedEventDataVerification } from "../Network/SyncSystem/veri";
import Pathfinding from "../Pathfinding";
import Entity from "../State/Entity";
import { AnimationType } from "../State/Entity/Graphics/AnimationHandler";
import HexCell from "../State/Hex/Cell";
import HexCellGraphics from "../State/Hex/Cell/Graphics";
import { ReadinessFragment } from "../Systems/TurnSystem/types";
import BattleCamera from "./BattleCamera";
import Graphics from "./Graphics/Mothership";
import EntityCellGraphicsTuple from "./Graphics/Tuple";
import Gui from './Gui';
import State from "./State";

export default class BattleClient {
    private logger = Logger.createContextLogger("ClientSide");

    private graphicsInitialised: Promise<[StateState]>;
    private animating: Promise<unknown> = Promise.resolve();
    private gui: Gui;
    private camera: BattleCamera;
    private state: State;
    private graphics: Graphics;

    private networking: NetworkService;

    private controlLocks: ControlLocks = new Map();

    private constructor(config: ClientSideConfig) {
        this.logger.debug("ClientSide constructor", config)
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

        // this.setupEventListeners();

        this.gui = Gui.Connect({
            networkService: this.networking,
            readinessFragments: this.state.getReadinessFragments(),
            eventBus: this.state.getEventBus(),
        });
        this.graphicsInitialised = this.initialiseGraphics();
        this.setupEventListeners();
        this.setupRemoteListeners();
    }

    private setupEventListeners() {
        const eventBus = this.state.getEventBus();
        eventBus.subscribe(GameEvent.TURN_STARTED, (id: unknown) => {
            const verification = t.number(id);
            if (!verification) {
                this.logger.error("Invalid ID type for TURN_STARTED event", id as defined);
                return;
            }
            this.returnToSelections();
        })
        eventBus.subscribe(GameEvent.ENTITY_INTEND_MOVE, (entity: unknown) => {
            const ver = entityMovedEventDataVerification(entity);
            if (!ver) {
                this.logger.error("Invalid entity moved event data", entity as defined);
                return;
            }
            const { entityId, from, to } = entity;
            const entityGraphicsExists = this.graphics.findEntityG(entityId);
            if (entityGraphicsExists) {
                this.graphics.moveEntity(from, to)
            }
            else {
                this.logger.warn("Entity moved event received but entity graphics not found", entityId);
                this.completeUpdate().then(() => {
                    eventBus.emit(GameEvent.ENTITY_INTEND_MOVE, entity);
                })
            }
        })
    }

    private setupRemoteListeners() {
        const eventBus = this.state.getEventBus();
        this.networking.onClientRequestOf('turnEnd', (id?: number) => {
            eventBus.emit(GameEvent.TURN_ENDED, id);
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
        this.logger.debug("Requesting update state and readiness map");
        const stateData = await serverRequestRemote.state();
        await this.state.sync(stateData);
        // this._localTickEntitiesCache = this.state.getEntityManager().getAllEntities();
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
            this.completeUpdate(),
        ]);
    }
    //#endregion

    //#region Get
    private getReadinessIcons() {
        const crMap: Map<PlayerID, ReadinessFragment> = this.state.getReadinessMapping();
        const readinessIcons: ReadinessIcon[] = [];
        for (const [playerID, readiness] of pairs(crMap)) {
            readinessIcons.push({
                playerID,
                iconUrl: this.state.getEntity(playerID)?.stats.id ?? '',
                readiness: readiness.pos,
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

    //#region UI-Related

    public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: () => {
                    serverRequestRemote.toAct().then(async accessToken => {
                        this.logger.debug("Access token received", accessToken);
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
                    serverRequestRemote.toAct().then(async accessToken => {
                        serverRemotes.end(accessToken);
                    })
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
        await this.localEntity().then(e => {
            this.camera.enterCharacterCenterMode(this.graphics.findEntityGByEntity(e)).then(() => {
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
    private async enterMovement(withToken: AccessToken) {
        this.logger.debug("Entering movement mode");
        const localE = await this.localEntity()

        this.controlLocks.set(Enum.KeyCode.X, true);

        this.gui.unmountAndClear(GuiTag.ActionMenu);
        this.gui.mountAbilitySlots(localE);
        this.gui.forceUpdateMainFrame('withSensitiveCells',
            this.state.getEntity(Players.LocalPlayer.UserId)!,
            this.getSensitiveCellElements(withToken)
        );
    }

    private exitMovement() {
        this.controlLocks.delete(Enum.KeyCode.X);

        this.gui.clearAll();
        this.gui.setMode('onlyReadinessBar')
    }

    private getSensitiveCellElements(accessToken: AccessToken): React.Element {
        const currentGraphicRepresentation = this.graphics.tuples();
        return <frame key={'SensitiveCells'}>{
            currentGraphicRepresentation.map(t => <CellSurface
                cell={t.cellGraphics}
                onEnter={() => this.handleCellEnter(t)}
                onclick={() => this.handleCellClick(t, accessToken)}
            />)}
        </frame>;
    }

    private async handleCellEnter(tuple: EntityCellGraphicsTuple) {
        this.logger.debug("Cell entered", tuple);
        const hoveredOverEntity = this.state.getEntity(tuple.cellGraphics.qr);
        const hoveredOverEntityGraphics = tuple.entityGraphics
        const currentActor = this.state.getCurrentActor();
        const currentActorQR = currentActor.qr;
        const currentCell = this.state.getCell(currentActorQR); assert(currentCell, "[handleCellEnter] Current cell is not defined");
        const currentActorGraphics = this.graphics.findTupleByEntity(currentActor)?.entityGraphics; assert(currentActorGraphics, "[handleCellEnter] Current actor graphics is not defined");

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
                    .mapFiltered((cell: HexCell) => this.graphics.positionTuple(cell.qr()))
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
            return this.gui.mountOrUpdateGlow(path.mapFiltered((qr) => this.graphics.positionTuple(qr).cellGraphics));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.get('pos') - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

    }

    private handleCellClick(clickedtuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        this.logger.debug("Cell clicked", clickedtuple);
        if (clickedtuple.entityGraphics) {
            this.logger.debug("State", this.state);
            const clickedOnEntity = this.state.getEntity(clickedtuple.cellGraphics.qr);
            assert(clickedOnEntity, "Clicked on entity is not defined");
            this.clickedOnEntity(clickedOnEntity, accessToken);
        }
        else {
            this.clickedOnEmptyCell(clickedtuple, accessToken);
        }
    }

    private async clickedOnEntity(clickedOn: Entity, accessToken: AccessToken) {
        this.logger.debug("Clicked on entity", clickedOn);
        const cre = this.state.getCurrentActor();
        if (!cre.armed) {
            this.logger.warn("[clickedOnEntity] Current entity is not armed");
            return;
        }
        const iability = cre.getEquippedAbilitySet()[cre.armed];
        const commitedAction = {
            type: ActionType.Attack,
            ability: {
                ...iability,
                using: cre,
                target: clickedOn.state(),
            },
            by: cre.playerID,
            against: clickedOn.playerID,
            executed: false,
        };
        accessToken.action = commitedAction
        return serverRequestRemote.act(accessToken)
    }

    private async clickedOnEmptyCell(emptyTuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        if (this.gui.getMode() !== 'withSensitiveCells') {
            this.logger.warn("Clicked on empty cell, but mode is not 'withSensitiveCells'");
            return;
        }
        this.logger.debug("Clicked on empty cell", emptyTuple);

        this.gui.setMode('onlyReadinessBar');

        const start = this.state.getCurrentActor().qr;
        const dest = emptyTuple.cellGraphics.qr;
        const ac = await this.commitMoveAction(accessToken, start, dest);

        const waitForMoveAnimation = await new Promise(resolve => {
            this.graphics.moveEntity(start, dest).then(() => {
                this.logger.debug("Entity moved", start, dest);
                resolve(void 0);
            })
        })

        const localE = await this.localEntity();
        if (localE.get('pos') >= 75) {
            this.logger.debug("Local entity is still ready");
            this.gui.setMode('withSensitiveCells');
        }
    }

    private async commitMoveAction(ac: AccessToken, start: Vector2, dest: Vector2) {
        this.logger.debug("Committing move action", start, dest);
        ac.action = {
            type: ActionType.Move,
            executed: false,
            by: ac.userId,
            to: dest,
            from: start,
        } as MoveAction;
        const res = await serverRequestRemote.act(ac);
        this.state.getEventBus().emit(GameEvent.ENTITY_INTEND_MOVE, {
            entityId: ac.userId,
            from: start,
            to: dest,
        })
        this.logger.debug("Move action committed, resolution:", res);
        return res
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

}