import Roact, { Portal } from "@rbxts/roact";
import { Players, TweenService, UserInputService } from "@rbxts/services";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readiness-bar";
import { MAX_READINESS, MOVEMENT_COST } from "shared/const";
import { getPlayer } from "shared/func";
import { ActionType, EntityActionOptions } from "shared/types/battle-types";
import { Battle } from "./Battle";
import Cell from "./Cell";
import Entity from "./Entity";
import Pathfinding from "./Pathfinding";

export default class BattleGUI {
    private actionMenuCallback: ((action: EntityActionOptions) => void) | undefined;
    private escapeScript: RBXScriptConnection | undefined;
    private ui: Roact.Tree;
    private glowPath: Roact.Tree | undefined;
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
        this.readinessIconMap = this.initializeReadinessIcons(battle);
        this.ui = this.mountInitialUI();

        const mouse = Players.LocalPlayer.GetMouse();
        mouse.Button1Down.Connect(() => {
            const target = mouse.Target;
            const ancestor = target?.FindFirstAncestorOfClass('Model');
            if (ancestor) {
                const entity = battle.getEntityFromModel(ancestor);
                if (entity?.cell) {
                    this.showActionDropdown(entity.cell);
                }
            }
        })
    }

    //#region UI Methods
    // Initialize readiness icons with references
    private initializeReadinessIcons(battle: Battle): Map<number, Roact.Ref<Frame>> {
        const readinessIcons = battle.getReadinessIcons();
        return new Map(readinessIcons.map((icon) => {
            const ref = Roact.createRef<Frame>();
            return [icon.iconID, ref];
        }));
    }

    // Mount the initial UI with readiness bar
    private mountInitialUI(): Roact.Tree {
        return Roact.mount(
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
            </MenuFrameElement>
        );
    }

    private returnToSelections() {
        const b = this.igetBattle();
        if (!b.currentRound?.entity.model) {
            warn("No entity model found");
            return;
        }
        this.exitMovement();
        b.setCameraToLookAtModel(b.currentRound.entity.model);
        this.showEntityActionOptions(b.currentRound.entity);
    }

    // Display entity action options and handle the chosen action
    showEntityActionOptions(entity: Entity, callback?: (action: EntityActionOptions) => void) {
        this.actionMenuCallback = callback ?? this.actionMenuCallback;

        const actions = entity.getActions();
        const actionOptions = actions.map((action, index) => (
            <ButtonElement
                Key={index}
                position={index / actions.size()}
                size={1 / actions.size()}
                onclick={() => this.handleActionClick(action.action, action.type, actionsUI, this.actionMenuCallback)}
                text={action.type}
                transparency={0.9}
            />
        ));

        const actionsUI = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)}>
                    {actionOptions}
                </ButtonFrameElement>
            </MenuFrameElement>
        );
    }

    // Handle click on an action button
    private handleActionClick(action: () => void, t: ActionType, ui: Roact.Tree, callback?: (action: EntityActionOptions) => void) {
        action();
        if (callback) {
            callback({
                type: t,
                ui: ui,
            });
        }
    }

    // Enter movement mode and display sensitive cells
    enterMovement() {
        if (!this.igetBattle()) return;
        this.escapeScript?.Disconnect();
        this.escapeScript = UserInputService.InputBegan.Connect((i, gpe) => {
            // print(i, gpe)
            if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                this.returnToSelections();
            }
        })
        Roact.update(this.ui, this.renderWithSensitiveCells());
    }

    // Exit movement mode and reset UI
    exitMovement() {
        if (!this.igetBattle() || !this.igetBattle().currentRound) {
            warn("No battle or current round");
            return;
        }
        if (this.glowPath) {
            Roact.unmount(this.glowPath)
            this.glowPath = undefined
        };
        this.escapeScript?.Disconnect();
        Roact.update(this.ui, this.renderWithReadinessBar());
    }
    //#endregion

    //#region Render Methods
    // Render the UI with readiness bar and sensitive cells
    private renderWithSensitiveCells() {
        print("Rendering with sensitive cells");
        return (
            <MenuFrameElement transparency={1} Key={`BattleUI`}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
                {this.generateSensitiveCells()}
            </MenuFrameElement>
        );
    }

    // Render the UI with only the readiness bar
    private renderWithReadinessBar() {
        return (
            <MenuFrameElement transparency={1} Key={`BattleUI`}>
                <ReadinessBarElement icons={this.igetBattle().getReadinessIcons()} ref={this.readinessIconMap} />
            </MenuFrameElement>
        );
    }
    //#endregion

    //#region Cell Methods
    // Generate sensitive cells for movement
    private generateSensitiveCells() {
        const battle = this.igetBattle();
        if (!battle) return;

        let currentPath: Vector2[] | undefined;
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
        if (!battle?.currentRound?.entity.cell) return;

        const lim = math.floor(battle.currentRound.entity.pos / MOVEMENT_COST);
        const pf = Pathfinding.Start({
            grid: battle.grid,
            start: battle.currentRound.entity.cell.xy,
            dest: cell.xy,
            limit: lim,
        });
        const path = pf.fullPath;

        if (!cell.entity) {
            const currentEntity = battle.currentRound.entity;
            const readinessAfterMove = (currentEntity.pos - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
            this.updateSpecificReadinessIcon(currentEntity.playerID, readinessAfterMove);
        }
        return this.glowAlongPath(path);
    }

    // Handle cell click event
    private handleCellClick(cell: Cell) {
        this.exitMovement();
        if (cell.isVacant()) {
            this.clickedOnEmptyCell(cell);
        }
        else {
            this.showActionDropdown(cell);
        }
    }

    private clickedOnEmptyCell(cell: Cell) {
        const battle = this.igetBattle();
        if (!battle?.currentRound?.entity.cell) return;

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
        currentEntity.moveToCell(cell, path).then(() => {
            if (this.glowPath) Roact.unmount(this.glowPath);
            cr.resolve(currentEntity);
        });
    }


    // Show action dropdown for the entity
    private showActionDropdown(cell: Cell) {
        const targetEntity = cell.entity;
        if (!targetEntity) return;
        print("Showing action dropdown for entity", targetEntity);
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
        if (this.glowPath) {
            Roact.update(this.glowPath,
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>
            );
        } else {
            this.glowPath = Roact.mount(
                <Portal target={playerGUI}>
                    <frame>{elements}</frame>
                </Portal>);
        }

        return path;
    }
    //#endregion

    //#region Readiness Bar Methods
    private getAllIcons() {
        const icons: Roact.Ref<Frame>[] = [];
        this.readinessIconMap.forEach((ref) => icons.push(ref));
        return icons;
    }

    updateSpecificReadinessIcon(iconID: number, readiness: number) {
        const icon = this.readinessIconMap.get(iconID)?.getValue();
        if (!icon) {
            warn("No icon found for readiness update");
            return;
        }

        const clampedReadiness = math.clamp(readiness, 0, 1);
        icon.TweenPosition(UDim2.fromScale(0, clampedReadiness), Enum.EasingDirection.InOut, Enum.EasingStyle.Linear, math.abs(icon.Position.Y.Scale - clampedReadiness), true);
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
}
