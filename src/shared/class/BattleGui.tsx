import Roact, { Portal } from "@rbxts/roact";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import BattleDDElement from "gui_sharedfirst/components/battle-dropdown";
import BattleDDAttackElement from "gui_sharedfirst/components/battle-dropdown-attack";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readiness-bar";
import { MAX_READINESS, MOVEMENT_COST } from "shared/const";
import { getPlayer } from "shared/func";
import { BattleAction, DropdownmenuContext, DropmenuAction, DropmenuActionType } from "shared/types/battle-types";
import Battle from "./Battle";
import Cell from "./Cell";
import Entity from "./Entity";

type MainUIModes = 'onlyReadinessBar' | 'withSensitiveCells';

export default class BattleGUI {
    actionsUI: Roact.Tree | undefined;
    dropDownMenuGui: Roact.Tree | undefined;
    glowPathGui: Roact.Tree | undefined;
    private mainGui: Roact.Tree;

    private mouseClickDDEvent: RBXScriptConnection | undefined;
    private escapeScript: RBXScriptConnection | undefined;

    private readinessIconMap: Map<number, Roact.Ref<Frame>>;

    private static battleInstance: Battle;
    private static instance: BattleGUI;

    // Getters for the singleton instance and the battle instance
    static GetBattle() {
        return BattleGUI.battleInstance;
    }
    getBattle() {
        return BattleGUI.battleInstance
    }

    static GetInstance() {
        return BattleGUI.instance;
    }
    getInstance() {
        return BattleGUI.instance;
    }

    // Singleton pattern to connect the BattleGUI with the Battle instance
    static Connect(battle: Battle) {
        if (!BattleGUI.instance) {
            BattleGUI.instance = new BattleGUI(battle);
        }
        return BattleGUI.instance;
    }

    // Private constructor to prevent direct instantiation
    private constructor(battle: Battle) {
        BattleGUI.battleInstance = battle;
        this.readinessIconMap = this.getReadinessIconFrameRefMap();
        this.mainGui = this.mountInitialUI();
    }

    /**
     * Get the readiness icons and create a map of iconID to Ref<Frame>
     * @returns map of iconID -> Ref<Frame>
     */
    private getReadinessIconFrameRefMap(): Map<number, Roact.Ref<Frame>> {
        const battle = this.getBattle();
        const readinessIcons = battle.getReadinessIcons();
        return new Map(readinessIcons.map((icon) => {
            const ref = Roact.createRef<Frame>();
            return [icon.iconID, ref];
        }));
    }

    /**
     * Mount the initial UI, which contains the MenuFrameElement and the ReadinessBarElement
     * @returns the mounted Tree
     */
    private mountInitialUI(): Roact.Tree {
        return Roact.mount(
            <MenuFrameElement Key={`BattleUI`} transparency={1}>
                <ReadinessBarElement icons={this.getBattle().getReadinessIcons()} ref={this.readinessIconMap} />
            </MenuFrameElement>
        );
    }

    /**
     * Return to the selection screen after movement or canceling an action
     *  1. exitMovementUI() is called to reset the UI
     *  2. The camera is centered on the current entity
     *  3. going back to the action selection screen
     */
    private returnToSelections() {
        const b = this.getBattle();
        this.exitMovement();
        b.bcamera.enterCharacterCenterMode().then(() => {
            if (!b.currentRound?.entity?.model) {
                warn("No entity model found");
                return;
            }
            this.mountActionMenu(b.getActions(b.currentRound.entity));
        })
    }

    /**
     * Set up a script that listens for the escape key (X) to cancel the current action
     * @returns the script connection
     */
    setUpCancelCurrentActionScript(): RBXScriptConnection {
        this.escapeScript?.Disconnect();
        return UserInputService.InputBegan.Connect((i, gpe) => {
            if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                this.returnToSelections();
            }
        })
    }

    /**
     * Set up a script that listens for mouse clicks on models to show the dropdown menu
     * @returns the script connection
     */
    private setupClickOnDropdownHandler(): RBXScriptConnection {
        const mouse = Players.LocalPlayer.GetMouse();
        this.mouseClickDDEvent?.Disconnect();
        return mouse.Button1Down.Connect(() => {
            const target = mouse.Target;
            const ancestor = target?.FindFirstAncestorOfClass('Model');
            if (!ancestor) return;

            const clickedEntity = this.getBattle().getEntityFromModel(ancestor);
            if (clickedEntity?.cell === undefined) return;

            const crEntity = this.getBattle().currentRound?.entity;
            if (!crEntity) return;

            crEntity.faceEntity(clickedEntity).then(() => {
                this.mountDropdownmenuAt(clickedEntity.cell!);
            });
        });
    }

    /**
     * Enter movement mode
     * Movement mode: when cells glow along with the cursor to create a pathfinding effect
     * 
     *  * set up scripts
     *  ** escape script to cancel the current action
     *  ** mouse click event to show the dropdown menu
     * 
     *  * rendering
     *  ** re-render the UI with sensitive cells
     * 
     */
    enterMovement() {
        print("Entering movement mode");
        this.escapeScript = this.setUpCancelCurrentActionScript();
        this.mouseClickDDEvent = this.setupClickOnDropdownHandler();
        this.updateMainUI('withSensitiveCells');
    }

    /**
     * Exit movement mode
     * Movement mode: when cells glow along with the cursor to create a pathfinding effect
     * 
     *   * rendering
     *   ** remove any existing glow path
     *   ** remove any existing dropdown menu
     *   ** re-render the UI with only the readiness bar
     * 
     *   * disconnect scripts
     *   ** escape (X) script
     *   ** click-on-model dropdown menu script
     * 
     */
    exitMovement() {
        print("Exiting movement mode");
        if (!this.getBattle()?.currentRound) {
            warn("No battle or current round");
            return;
        }

        // 1. Remove the glow path
        if (this.glowPathGui) {
            this.unmountAndClear('glowPathGui');
        };

        // 2. Disconnect the escape script and mouse click event
        this.escapeScript?.Disconnect();
        this.mouseClickDDEvent?.Disconnect();

        // 3. Remove the dropdown menu
        if (this.dropDownMenuGui) {
            this.unmountAndClear('dropDownMenuGui');
        }

        // 4. Update the UI without the sensitive cells
        this.mainGui = this.updateMainUI('onlyReadinessBar')
    }

    /**
     * Updating main UI with a specific mode
     *  * `onlyReadinessBar`: only the readiness bar is shown
     *  * `withSensitiveCells`: the readiness bar and the sensitive cells (surfacegui on cells)
     * 
     * @param mode 
     * @returns the updated Roact tree
     */
    updateMainUI(mode: MainUIModes) {
        print(`Updating main UI with mode: ${mode}`);
        switch (mode) {
            case 'onlyReadinessBar':
                return Roact.update(this.mainGui,
                    <MenuFrameElement transparency={1} Key={`BattleUI`}>
                        <ReadinessBarElement icons={this.getBattle().getReadinessIcons()} ref={this.readinessIconMap} />
                    </MenuFrameElement>);
            case 'withSensitiveCells':
                return Roact.update(this.mainGui,
                    <MenuFrameElement transparency={1} Key={`BattleUI`}>
                        <ReadinessBarElement icons={this.getBattle().getReadinessIcons()} ref={this.readinessIconMap} />
                        {this.createSensitiveCellElements()}
                    </MenuFrameElement>);
        }
    }

    /**
     * Mounts action menu
     * Action Menu: a menu that shows the available actions for the entity's turn (e.g. go into move mode, items, end turn)
     * 
     * @param actions 
     * @returns 
     */
    mountActionMenu(actions: BattleAction[]) {
        print("Mounting action menu");
        this.unmountAndClear('actionsUI');
        this.actionsUI = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)}>
                    {actions.map((action, index) => (
                        <ButtonElement
                            Key={action.type}
                            position={index / actions.size()}
                            size={1 / actions.size()}
                            onclick={() => {
                                if (this.actionsUI) action.run(this.actionsUI)
                            }}
                            text={action.type}
                            transparency={0.9}
                        />
                    ))}
                </ButtonFrameElement>
            </MenuFrameElement>);
        return this.actionsUI;
    }

    //#region Cell Methods
    /**
     * Get cell elements that are sensitive to mouse hover
     * @returns 
     */
    private createSensitiveCellElements(): Roact.Element | undefined {
        return <frame>
            {this.getBattle().grid.cells.map((c) => (
                <CellSurfaceElement
                    cell={c}
                    onEnter={() => this.handleCellEnter(c)}
                    onclick={() => this.handleCellClick(c)}
                />
            ))}
        </frame>;
    }

    // Handle cell hover (enter) event
    private handleCellEnter(cell: Cell) {
        const battle = this.getBattle();
        if (!battle?.currentRound?.entity?.cell) return;

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (cell.isVacant()) {
            mouse.Icon = '';
        }
        else {
            mouse.Icon = 'rbxassetid://89793300852596';
        }

        // 1. Create path
        const path = battle.createPathForCurrentEntity(cell.xy);
        if (!path) return;

        // 2. Move readiness icon to forecast post-move position
        const currentEntity = battle.currentRound.entity;
        const readinessPercent = (currentEntity.pos - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        this.updateSpecificReadinessIcon(currentEntity.playerID, readinessPercent);

        // 3. Glow along the path
        return this.mountOrUpdateGlowPath(path);
    }

    // Handle cell click event
    private handleCellClick(cell: Cell) {
        if (cell.isVacant()) {
            this.clickedOnEmptyCell(cell);
        }
    }

    private clickedOnEmptyCell(cell: Cell) {
        const battle = this.getBattle();
        if (!battle?.currentRound?.entity?.cell) return;

        const path = battle.createPathForCurrentEntity(cell.xy);
        const cr = battle.currentRound!;
        const currentEntity = cr.entity;
        currentEntity?.moveToCell(cell, path).then(() => {
            this.returnToSelections();
        });
    }

    // Highlight the cells along a path
    mountOrUpdateGlowPath(path: Vector2[]) {
        const elements = path.mapFiltered((xy) => {
            const cell = this.getBattle().grid.getCell(xy.X, xy.Y);
            if (!cell) return;

            cell.glow = true;
            return <CellGlowSurfaceElement cell={cell} />;
        });

        const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");
        if (!playerGUI) {
            warn("No player GUI found");
            return;
        }
        if (this.glowPathGui) {
            Roact.update(this.glowPathGui,
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>
            );
        } else {
            this.glowPathGui = Roact.mount(
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>);
        }

        return path;
    }

    mountOrUpdateGlowRange(_cell: Cell, range: { min: number, max: number }) {
        //#region defence
        const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");
        if (!playerGUI) {
            warn("No player GUI found");
            return;
        }
        //#endregion

        const elements = this.getBattle().grid.cells.mapFiltered((c) => {
            if (!c) return;
            const distance = c.xy.sub(_cell.xy).Magnitude;
            if (range.min <= distance && distance <= range.max) {
                c.glow = true;
                return <CellGlowSurfaceElement cell={c} />;
            }
        });

        if (this.glowPathGui) {
            Roact.update(this.glowPathGui,
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>
            );
        } else {
            this.glowPathGui = Roact.mount(
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>);
        }
    }

    //#endregion

    //#region Dropmenu
    mountDropdownDebounce = false;
    private mountDropdownmenuAt(cell: Cell) {
        if (this.mountDropdownDebounce) return;
        this.mountDropdownDebounce = true;
        print("Showing action dropdown");
        const cellEntity = cell.entity;
        if (!cellEntity) {
            warn("No target entity found");
            return;
        }

        const options = this.getDropMenuActions(cellEntity);
        const battle = this.getBattle();

        if (this.dropDownMenuGui) {
            Roact.update(this.dropDownMenuGui,
                <BattleDDElement
                    mouseLocation={UserInputService.GetMouseLocation()}
                    battle={battle}
                    options={options}
                    cell={cell}
                />);
        }
        else {
            this.dropDownMenuGui = Roact.mount(
                <BattleDDElement
                    mouseLocation={UserInputService.GetMouseLocation()}
                    battle={battle}
                    options={options}
                    cell={cell}
                />,
            )
        }
        wait(0.1);
        this.mountDropdownDebounce = false;
    }

    //#region Dropmenu Handlers
    getHandler_MoveTo(): DropmenuAction {
        return {
            name: DropmenuActionType.MoveTo,
            run: async (ctx: DropdownmenuContext) => {
                print("Moving to");
                const battle = this.getBattle();
                battle.moveEntity(ctx.initiator, ctx.cell).then(() => {
                    this.returnToSelections();
                });
            }
        }
    }
    getHandler_Attack() {
        const occ = {
            isHovering: false,
            isRendering: false,
            render: (ctx: DropdownmenuContext) => (
                <BattleDDAttackElement
                    dropdownMenu={ctx.dropdownMenu}
                    battle={this.getBattle()}
                    ctx={ctx}
                />
            )
        };
        return {
            name: DropmenuActionType.Attack,
            run: async (ctx: DropdownmenuContext) => {
                print("Attacking");
                this.getBattle().setUpOnAttackClickedSignal();
            },
            onClickChain: occ
        }
    }
    getHandler_EndTurn() {
        return {
            name: DropmenuActionType.EndTurn,
            run: async (ctx: DropdownmenuContext) => {
                print("Ending turn");
                this.guiDoneRoundExit();
            }
        }
    }
    //#endregion

    private getDropMenuAction(action: DropmenuActionType): DropmenuAction | undefined {
        switch (action) {
            case DropmenuActionType.Attack:
                return this.getHandler_Attack();
            case DropmenuActionType.MoveTo:
                return this.getHandler_MoveTo();
            case DropmenuActionType.EndTurn:
                return this.getHandler_EndTurn();
        }
    }

    private getDropMenuActions(cellEntity: Entity): DropmenuAction[] {
        const battle = this.getBattle();
        const actions: DropmenuAction[] = [];
        for (const [k, v] of pairs(DropmenuActionType)) {
            const action = this.getDropMenuAction(v);
            if (cellEntity !== battle.currentRound?.entity && k === 'EndTurn') {
                continue;
            }
            else if (action) {
                actions.push(action);
            }

        }
        return actions;
    }
    //#endregion

    //#region Readiness Bar Methods
    async updateSpecificReadinessIcon(iconID: number, readiness: number) {
        const iconFrame = this.readinessIconMap.get(iconID)?.getValue();
        if (!iconFrame) {
            warn("No icon found for readiness update", iconID);
            return;
        }

        const clampedReadiness = math.clamp(readiness, 0, 1);
        return new Promise((resolve) => {
            iconFrame.TweenPosition(
                UDim2.fromScale(0, clampedReadiness),
                Enum.EasingDirection.InOut,
                Enum.EasingStyle.Linear,
                math.abs(iconFrame.Position.Y.Scale - clampedReadiness),
                true,
                resolve
            );
        })
    }

    // Animate the readiness bar update
    tweenToUpdateReadiness() {
        print("Tweening to update readiness");
        const newReadinessIcons = this.getBattle().getReadinessIcons();
        const promises: Promise<void>[] = [];

        for (const icon of newReadinessIcons) {
            const ref = this.readinessIconMap.get(icon.iconID);
            if (!ref) continue;
            const iconRef = ref.getValue();
            if (!iconRef) continue;

            const readiness = icon.readiness;
            const positionTween = TweenService.Create(
                iconRef,
                new TweenInfo(math.abs(iconRef.Position.Y.Scale - readiness), Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { Position: UDim2.fromScale(0, readiness) }
            );

            promises.push(new Promise((resolve) => {
                positionTween.Completed.Connect(() => resolve());
                positionTween.Play();
            }));
        }

        return Promise.all(promises);
    }
    //#endregion

    //#region UI Unmount Methods

    unmountAndClear(propertyName: keyof this): void {
        const property = this[propertyName];
        if (property !== undefined && typeOf(property) === 'table') {
            print(`Unmounting and clearing: ${propertyName as string}`);
            const [s, f] = pcall(() => {
                Roact.unmount(property as Roact.Tree);
                this[propertyName] = undefined as unknown as this[typeof propertyName];
            });
            if (!s) {
                warn(`Failed to unmount: ${f}`);
            }
        }
    }

    //#endregion

    guiDoneRoundExit() {
        print("【Gui done round】");
        this.escapeScript?.Disconnect();
        this.mouseClickDDEvent?.Disconnect();
        if (this.actionsUI) {
            this.unmountAndClear('actionsUI');
        }
        if (this.dropDownMenuGui) {
            this.unmountAndClear('dropDownMenuGui');
        }
        if (this.glowPathGui) {
            this.unmountAndClear('glowPathGui');
        }
        this.mainGui = this.updateMainUI('onlyReadinessBar')
        this.getBattle().currentRound?.endRoundResolve?.(void 0);
    }
}
