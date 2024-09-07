import Roact, { Portal } from "@rbxts/roact";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import BattleDD from "gui_sharedfirst/components/battle-dropdown";
import BattleDDAttackElement from "gui_sharedfirst/components/battle-dropdown-attack";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readiness-bar";
import { MAX_READINESS, MOVEMENT_COST } from "shared/const";
import { getPlayer } from "shared/func";
import { Action, DropdownmenuContext, DropmenuAction, DropmenuActionType } from "shared/types/battle-types";
import { Battle } from "./Battle";
import Cell from "./Cell";
import Entity from "./Entity";
import Pathfinding from "./Pathfinding";

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
    static getBattle() {
        return BattleGUI.battleInstance;
    }
    igetBattle() {
        return BattleGUI.battleInstance
    }

    static getInstance() {
        return BattleGUI.instance;
    }
    igetInstance() {
        return BattleGUI.instance;
    }

    // Singleton pattern to start the BattleGUI
    static Start(battle: Battle) {
        if (!BattleGUI.instance) {
            BattleGUI.instance = new BattleGUI(battle);
        }
        return BattleGUI.instance;
    }

    // Private constructor to prevent direct instantiation
    private constructor(battle: Battle) {
        BattleGUI.battleInstance = battle;
        this.readinessIconMap = this.initializeReadinessIconFrameRefs(battle);
        this.mainGui = this.mountInitialUI();
    }

    //#region UI Methods
    // Initialize readiness icons with references
    private initializeReadinessIconFrameRefs(battle: Battle): Map<number, Roact.Ref<Frame>> {
        const readinessIcons = battle.getReadinessIcons();
        return new Map(readinessIcons.map((icon) => {
            const ref = Roact.createRef<Frame>();
            return [icon.iconID, ref];
        }));
    }

    // Mount the initial UI with readiness bar
    private mountInitialUI(): Roact.Tree {
        return Roact.mount(
            <MenuFrameElement Key={`BattleUI`} transparency={1}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
            </MenuFrameElement>
        );
    }

    private returnToSelections() {
        const b = this.igetBattle();
        this.exitMovementUI();
        b.bcamera.enterCharacterCenterMode().then(() => {
            if (!b.currentRound?.entity?.model) {
                warn("No entity model found");
                return;
            }
            this.showEntityActionOptions(b.currentRound.entity);
        })
    }

    // Display entity action options and handle the chosen action
    showEntityActionOptions(entity: Entity) {
        const actions = this.igetBattle().getActions(entity);
        this.actionsUI = this.renderActionMenu(actions);
    }

    // Handle the escape key press
    setUpCancelCurrentActionScript() {
        this.escapeScript?.Disconnect();
        return UserInputService.InputBegan.Connect((i, gpe) => {
            if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                this.returnToSelections();
            }
        })
    }

    // Set up the mouse click handler
    private setupMouseClickModelHandler() {
        const mouse = Players.LocalPlayer.GetMouse();
        this.mouseClickDDEvent?.Disconnect();
        return mouse.Button1Down.Connect(() => {
            const target = mouse.Target;
            const ancestor = target?.FindFirstAncestorOfClass('Model');
            if (!ancestor) return;

            const clickedEntity = this.igetBattle().getEntityFromModel(ancestor);
            if (!clickedEntity?.cell) return;

            this.showDropdownMenuAt(clickedEntity.cell);

            const crEntity = this.igetBattle().currentRound?.entity;
            if (!crEntity) return;


            crEntity.faceEntity(clickedEntity).then(() => {
                this.showEntityActionOptions(crEntity);
            });
        });
    }

    // Enter movement mode and display sensitive cells
    enterMovement() {
        print("Entering movement mode");
        const b = this.igetBattle();
        if (!b) return;

        b.bcamera.enterHOI4Mode().then(() => {
            this.escapeScript = this.setUpCancelCurrentActionScript();
            this.mouseClickDDEvent = this.setupMouseClickModelHandler();
            this.renderWithSensitiveCells();
        });
    }

    // Exit movement mode and reset UI
    exitMovementUI() {
        print("Exiting movement mode");
        if (!this.igetBattle()?.currentRound) {
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
        this.mainGui = this.renderWithOnlyReadinessBar()
    }
    //#endregion

    //#region Render Methods
    // Render the UI with readiness bar and sensitive cells
    renderWithSensitiveCells() {
        print("Rendering with sensitive cells");
        return Roact.update(this.mainGui,
            <MenuFrameElement transparency={1} Key={`BattleUI`}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
                {this.generateSensitiveCells()}
            </MenuFrameElement>);
    }

    private renderActionMenu(actions: Action[]) {
        print("Rendering action menu");
        this.unmountAndClear('actionsUI');
        const actionOptions = actions.map((action, index) => (
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
        ));
        return Roact.mount(
            <MenuFrameElement transparency={1}>
                <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)}>
                    {actionOptions}
                </ButtonFrameElement>
            </MenuFrameElement>);
    }

    // Render the UI with only the readiness bar
    renderWithOnlyReadinessBar() {
        print("Rendering with readiness bar");
        return Roact.update(this.mainGui,
            <MenuFrameElement transparency={1} Key={`BattleUI`}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
            </MenuFrameElement>);
    }
    //#endregion

    //#region Cell Methods
    // Generate sensitive cells for movement
    private generateSensitiveCells() {
        const battle = this.igetBattle();
        if (!battle) return;
        return <frame>
            {battle.grid.cells.map((c) => (
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
        const battle = this.igetBattle();
        if (!battle?.currentRound?.entity?.cell) return;

        const lim = math.floor(battle.currentRound.entity.pos / MOVEMENT_COST);
        const pf = Pathfinding.Start({
            grid: battle.grid,
            start: battle.currentRound.entity.cell.xy,
            dest: cell.xy,
            limit: lim,
        });
        const path = pf.fullPath;

        const currentEntity = battle.currentRound.entity;
        const readinessAfterMove = (currentEntity.pos - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        this.updateSpecificReadinessIcon(currentEntity.playerID, readinessAfterMove);
        return this.glowAlongPath(path);
    }

    // Handle cell click event
    private handleCellClick(cell: Cell) {
        this.exitMovementUI();
        if (cell.isVacant()) {
            this.clickedOnEmptyCell(cell);
        }
        else {
            this.showDropdownMenuAt(cell);
        }
    }

    private clickedOnEmptyCell(cell: Cell) {
        const battle = this.igetBattle();
        if (!battle?.currentRound?.entity?.cell) return;

        const lim = math.floor(battle.currentRound.entity.pos / MOVEMENT_COST);
        const pf = Pathfinding.Start({
            grid: battle.grid,
            start: battle.currentRound.entity.cell.xy,
            dest: cell.xy,
            limit: lim,
        });
        const path = pf.fullPath;

        const cr = battle.currentRound!;
        const currentEntity = cr.entity;
        currentEntity?.moveToCell(cell, path).then(() => {
            this.returnToSelections();
        });
    }

    // Highlight the cells along a path
    glowAlongPath(path: Vector2[]) {
        const elements = path.mapFiltered((xy) => {
            const cell = this.igetBattle().grid.getCell(xy.X, xy.Y);
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
    //#endregion

    //#region Dropmenu
    private showDropdownMenuAt(cell: Cell) {
        print("Showing action dropdown");
        const cellEntity = cell.entity;
        if (!cellEntity) {
            warn("No target entity found");
            return;
        }

        const options = this.getDropMenuActions(cellEntity);
        const battle = this.igetBattle();

        if (this.dropDownMenuGui) {
            Roact.unmount(this.dropDownMenuGui);
        }
        this.dropDownMenuGui = Roact.mount(
            <BattleDD
                battle={battle}
                options={options}
                cell={cell}
            />,
        )
    }

    //#region Dropmenu Handlers
    getHandler_MoveTo(): DropmenuAction {
        return {
            name: DropmenuActionType.MoveTo,
            run: async (ctx: DropdownmenuContext) => {
                print("Moving to");
                const battle = this.igetBattle();
                battle.moveEntity(ctx.initiator, ctx.cell).then(() => {
                    this.returnToSelections();
                });
            }
        }
    }
    getHandler_Attack() {
        return {
            name: DropmenuActionType.Attack,
            run: async (ctx: DropdownmenuContext) => {
                print("Attacking");
            },
            onClickChain: {
                isRendering: false,
                render: (ctx: DropdownmenuContext) => <BattleDDAttackElement ctx={ctx} />
            }
        }
    }
    getHandler_EndTurn() {
        return {
            name: DropmenuActionType.EndTurn,
            run: async (ctx: DropdownmenuContext) => {
                print("Ending turn");
                this.doneRound();
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
        const battle = this.igetBattle();
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
    private getAllIcons() {
        const icons: Roact.Ref<Frame>[] = [];
        this.readinessIconMap.forEach((ref) => icons.push(ref));
        return icons;
    }

    updateSpecificReadinessIcon(iconID: number, readiness: number) {
        const iconFrame = this.readinessIconMap.get(iconID)?.getValue();
        if (!iconFrame) {
            warn("No icon found for readiness update");
            return;
        }

        const clampedReadiness = math.clamp(readiness, 0, 1);
        iconFrame.TweenPosition(UDim2.fromScale(0, clampedReadiness), Enum.EasingDirection.InOut, Enum.EasingStyle.Linear, math.abs(iconFrame.Position.Y.Scale - clampedReadiness), true);
    }

    // Animate the readiness bar update
    tweenToUpdateReadiness() {
        print("Tweening to update readiness");
        const newReadinessIcons = this.igetBattle().getReadinessIcons();
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

    doneRound() {
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
        this.igetBattle().currentRound?.endRoundResolve?.(void 0);
        this.mainGui = this.renderWithOnlyReadinessBar()
    }
}
