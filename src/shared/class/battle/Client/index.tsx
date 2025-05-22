import React from "@rbxts/react";
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import { t } from "@rbxts/t";
import CellSurface from "gui_sharedfirst/components/cell-surface";
import { AccessToken, ActionType, AttackAction, BattleAction, CharacterActionMenuAction, CharacterMenuAction, ClientSideConfig, ControlLocks, EntityStatus, MoveAction, NeoClashResult, PlayerID, ReadinessIcon, ResolveAttacksAction, StateState, TILE_SIZE } from "shared/class/battle/types";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag } from "shared/const";
import { serverRemotes, serverRequestRemote } from "shared/remote";
import Logger from "shared/utils/Logger";
import { GameEvent } from "../Events/EventBus";
import { NetworkService } from "../Network";
import { attackActionRefVerification, clashesVerification, entityMovedEventDataVerification } from "../Network/SyncSystem/veri";
import Pathfinding from "../Pathfinding";
import Entity from "../State/Entity";
import EntityGraphics from "../State/Entity/Graphics";
import { AnimationType } from "../State/Entity/Graphics/AnimationHandler";
import { EntityState } from "../State/Entity/types";
import HexCell from "../State/Hex/Cell";
import HexCellGraphics from "../State/Hex/Cell/Graphics";
import { ActiveAbilityState } from "../Systems/CombatSystem/Ability/types";
import { ReadinessFragment } from "../Systems/TurnSystem/types";
import BattleCamera from "./BattleCamera";
import CombatEffectsService from "./Effects/CombatEffectsServices";
import Graphics from "./Graphics";
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
            readinessFragments: this.state.getReadinessFragments(),
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
            const validateTurnStartIDWithServer = serverRequestRemote.cre()
            validateTurnStartIDWithServer.then(server_id => {
                if (id !== server_id) {
                    this.logger.error("Turn ID mismatch", id, server_id);
                    this.completeUpdate().then(() => {
                        this.state.getEventBus().emit(GameEvent.TURN_STARTED, server_id);
                    })
                    return;
                }

                if (id === Players.LocalPlayer.UserId) {
                    this.localEntity().then(e => {
                        this.camera.enterCharacterCenterMode(this.graphics.findEntityGByEntity(e)).then(() => {
                            this.gui.mountActionMenu(this.getCharacterMenuActions(e));
                        })
                    })
                }
                else {
                    this.camera.enterHOI4Mode();
                }
            })
        })
        eventBus.subscribe(GameEvent.TURN_ENDED, (id: unknown) => {
            const verification = t.number(id);
            if (!verification) {
                this.logger.error("Invalid ID type for TURN_ENDED event", id as defined);
                return;
            }
            this.animating
                .andThen(() => serverRequestRemote.actor(id))
                .andThen((serverEntityState: EntityState | undefined) => {
                    const context = 'in TURN_ENDED after requesting actor'
                    if (serverEntityState) {
                        const entity = this.state.getEntity(id);
                        if (entity) {
                            let localEntityGraphic = this.graphics.findEntityGByEntity(entity);
                            let localEntity = this.state.getEntity(id);
                            if (!localEntity) {
                                this.logger.warn("Entity not found in state", context, id);
                                localEntity = this.state.getEntity(id)!; // TODO
                            }
                            if (!localEntityGraphic) {
                                this.logger.warn("Graphic not found for entity", context, id);
                                localEntityGraphic = this.graphics.positionNewPlayer(serverEntityState, localEntity.qr)
                            }

                            this.state.sync({
                                entities: [serverEntityState],
                            })
                            this.graphics.moveEntity(localEntity.qr, serverEntityState.qr);
                        }
                        else {
                            this.logger.error("Entity not found locally", context, id);
                            return;
                        }
                    }
                    else {
                        this.logger.fatal("Actor not found for TURN_ENDED event", id);
                        return;
                    }
                })
        })

        eventBus.subscribe(GameEvent.ENTITY_INTEND_MOVE, (data: unknown) => {
            const veri = entityMovedEventDataVerification(data);
            if (!veri) {
                this.logger.error("Invalid data type for ENTITY_INTEND_MOVE event", data as defined);
                return;
            }
            const { entityId, from, to } = data;
            this.animating = this.graphics.moveEntity(from, to);
            this.animating.then(() => {
                this.state.getEventBus().emit(GameEvent.ENTITY_MOVED, {
                    entityId,
                    from,
                    to,
                });
            })
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

            this.handleAnimatingClashes(neoClashResults, attackActionRef).then(() => {
                this.state.getEventBus().emit(GameEvent.COMBAT_STARTED, neoClashResults, attackActionRef);
            });

        })

        // eventBus.subscribe(GameEvent.ENTITY_UPDATED, (entityUpdate: unknown) => {
        // })
    }

    private setupRemoteListeners() {
        const eventBus = this.state.getEventBus();
        this.networking.onClientRemote('animate', (accessToken: AccessToken) => {
            const context = 'client remote called to animate'
            if (!accessToken.action) {
                this.logger.error("Access token has no action", context, accessToken);
                return;
            }
            this.state.commit(accessToken.action);
            this.animating.then(() => {
                this.animating = this.handleGeneralAnimation(accessToken.action!);
            })
        })
        this.networking.onClientRemote('turnEnd', (id?: number) => {
            this.logger.debug("Client received: Turn ended", id);
            eventBus.emit(GameEvent.TURN_ENDED, id);
            this.camera.enterHOI4Mode();
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
    private getAttackerAndDefenderGraphics(attackActionRef: AttackAction): [EntityGraphics?, EntityGraphics?] {
        return [
            this.graphics.findEntityG(attackActionRef.by),
            attackActionRef.against ? this.graphics.findEntityG(attackActionRef.against) : undefined,
        ]
    }
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
                        if (accessToken.allowed) {
                            const newAccessToken = {
                                ...accessToken,
                                action: {
                                    type: ActionType.Move,
                                    to: entity.playerID,
                                    by: entity.playerID,
                                    executed: false
                                }
                            };
                            this.camera.enterHOI4Mode().then(() => {
                                this.enterMovement(newAccessToken);
                            })
                        }
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
    //#region Movement
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
        this.gui.mountFightingStyleSelector(localE);
        this.gui.forceUpdateMainFrame('withSensitiveCells',
            this.state.getEntity(Players.LocalPlayer.UserId)!,
            this.getSensitiveCellElements(withToken)
        );
    }

    private exitMovement() {
        this.controlLocks.delete(Enum.KeyCode.X);

        // Clear all UI elements
        this.gui.unmountAndClear(GuiTag.FightingStyleSelector);
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
            const clickedOnEntity = this.state.getEntity(clickedtuple.cellGraphics.qr); assert(clickedOnEntity, "Clicked on entity is not defined");
            this.clickedOnEntity(clickedOnEntity, accessToken);
        }
        else {
            this.clickedOnEmptyCell(clickedtuple, accessToken);
        }
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

        // set action
        accessToken.action = {
            type: ActionType.Move,
            executed: false,
            by: accessToken.userId,
            to: dest,
            from: start,
        } as MoveAction;

        // commit action to server
        const ac = await this.commitToServer(accessToken);

        if (ac.allowed) {
            // emit event to this client
            this.state.getEventBus().emit(GameEvent.ENTITY_INTEND_MOVE, {
                entityId: accessToken.userId,
                from: start,
                to: dest,
            })

            // commit action to local state
            this.state.commit(accessToken.action);

            const waitForMoveAnimation = await this.animating;

            const localE = await this.localEntity();
            if (localE.get('pos') >= 75) {
                this.logger.debug("Local entity is still ready");
                this.gui.setMode('withSensitiveCells');
            }
        }
        else {
            this.logger.warn("Action not allowed", ac);
            this.gui.setMode('onlyReadinessBar');
            // this.state.getEventBus().emit(GameEvent.ACTION_NOT_ALLOWED, accessToken.action);
        }
    }
    //#endregion

    //#region Combat

    private isAttackKills(attackerAction: AttackAction, clash: NeoClashResult) {
        const { against } = attackerAction;
        if (!against) {
            this.logger.warn("Attack action has no target");
            return false;
        }
        const target = this.state.getEntity(against);
        const { result } = clash
        if (!target) return false;

        if (result.fate === "Miss" || result.fate === "Cling") {
            return false;
        }

        const targetHp = target.get('hip') || 0;
        const damage = this.calculateDamageFromResult(clash);
        return targetHp <= damage;
    }

    private calculateDamageFromResult(clash: NeoClashResult): number {
        const { weapon, armour: target, result } = clash

        if (result.fate === "Miss" || result.fate === "Cling") {
            return 0;
        }

        let damageMultiplier = 1;
        if (result.fate === "CRIT") {
            damageMultiplier = 1.5;
        }

        const baseDamage = result.roll + result.bonus;
        return math.floor(baseDamage * damageMultiplier);
    }

    private async clickedOnEntity(clickedOn: Entity, accessToken: AccessToken) {
        this.logger.debug("Clicked on entity", clickedOn);
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
        this.commitToServer(accessToken)

        // emit event to this client
        this.state.getEventBus().emit(GameEvent.ENTITY_INTEND_ATTACK, clashes, attackAction);

        // commit action to local state
        this.state.commit(resolveAction);

        const waitForMoveAnimation = await this.animating;

        const localE = await this.localEntity();
        if (localE.get('pos') >= 75) {
            this.logger.debug("Local entity is still ready");
            this.gui.setMode('withSensitiveCells');
        }
    }

    //#endregion
    //#endregion

    //#region Server Requests
    private async commitToServer(ac: AccessToken) {
        const res = await serverRequestRemote.act(ac);
        this.logger.debug("action committed, resolution:", res);
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
    private async handleGeneralAnimation(action: BattleAction) {
        switch (action.type) {
            case ActionType.Move:
                this.logger.debug("Handling move animation", action);
                const { by, to } = action as MoveAction;
                const entity = this.state.getEntity(by);
                if (entity) {
                    const graphic = this.graphics.findEntityG(entity);
                    if (graphic) {
                        return this.graphics.moveEntity(entity.qr, to);
                    }
                }
                break;
            case ActionType.Attack:
                break;
            case ActionType.ResolveAttacks:
                break;
        }
    }

    private async handleAnimatingClashes(clashes: NeoClashResult[], attackActionRef: AttackAction): Promise<void> {
        this.logger.debug("Animating clashes", clashes, "BattleClient");
        // await this.animating;
        // const [attacker, defender] = this.state.getAttackerAndDefender(attackActionRef);
        for (const clash of clashes) {
            const { weapon, armour: target, result } = clash;
            const defenceSuccessful = result.fate === 'Miss' || result.fate === 'Cling';
            await this.playAttackAnimation({
                ability: attackActionRef.ability,
                type: ActionType.Attack,
                by: attackActionRef.by,
                against: attackActionRef.against,
                executed: false,
            }, clash)
        }
    }
    /**
     * Convert a world position to screen position for UI effects
     */
    private worldToScreenPosition(worldPos: Vector3): UDim2 {
        const camera = game.Workspace.CurrentCamera;
        if (!camera) return new UDim2(0.5, 0, 0.5, 0);

        const [screenPos, isVisible] = camera.WorldToScreenPoint(worldPos);
        return new UDim2(0, screenPos.X, 0, screenPos.Y);
    }

    private async playAttackAnimation(aa: AttackAction, clash: NeoClashResult) {
        await this.animating;
        this.logger.debug("Playing attack animation", aa);
        const { animation } = aa.ability;
        const [attacker, target] = this.getAttackerAndDefenderGraphics(aa);
        if (!attacker || !target) {
            this.logger.warn(`[playAttackAnimation] ${!attacker ? "Attacker" : ""} ${!target ? "Target" : ""} not found`);
            return;
        }
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
            // return;
        }

        try {
            // 1. Wait for the attack animation to reach the "Hit" marker.
            if (attackAnimation) await this.waitForAnimationMarker(attackAnimation, "Hit");            // 2. Show combat effects for the attack outcome
            const combatEffects = CombatEffectsService.getInstance();
            const targetHead = target.model.FindFirstChild("Head");
            const targetHeadPos =
                targetHead && targetHead.IsA("BasePart") ? targetHead.Position :
                    target.model.PrimaryPart ? target.model.PrimaryPart.Position : undefined;

            // this.logger.debug("Target head position", targetHeadPos);

            if (targetHeadPos) {
                const screenPos = this.worldToScreenPosition(targetHeadPos);
                // this.logger.debug("Screen position", screenPos);

                // Show impact effect
                const impactSize = clash.result.fate === "CRIT" ? 50 : 30;
                combatEffects.showHitImpact(screenPos, new Color3(1, 0, 0), impactSize);

                // Show damage indicator if the attack hit
                if (clash.result.damage && clash.result.fate !== "Miss" && clash.result.fate !== "Cling") {
                    const damage = clash.result.damage;

                    // Show critical hit effect if applicable
                    if (clash.result.fate === "CRIT") {
                        combatEffects.showAbilityReaction(
                            new UDim2(screenPos.X.Scale, screenPos.X.Offset, screenPos.Y.Scale, screenPos.Y.Offset - 30),
                            new Color3(1, 0.8, 0),
                            "CRITICAL!"
                        );
                    }

                    task.delay(.5, () => {
                        combatEffects.showDamage(screenPos, damage);
                    })
                } else {
                    // Show miss text
                    combatEffects.showAbilityReaction(screenPos, new Color3(0.7, 0.7, 0.7), clash.result.fate);
                }
            }

            // 3. Play the appropriate animation based on the outcome of the attack.
            targetAnimationHandler.killAnimation(AnimationType.Idle);
            targetAnimationHandler.killAnimation(AnimationType.Defend);

            if (this.isAttackKills(aa, clash)) {
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