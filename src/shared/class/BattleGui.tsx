import Roact from "@rbxts/roact";
import { TweenService } from "@rbxts/services";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readinessBar";
import { ActionType, EntityActionOptions } from "shared/types/battle-types";
import { Battle } from "./Battle";
import Cell from "./Cell";
import Entity from "./Entity";
import Pathfinding from "./Pathfinding";


export default class BattleGUI {
    private ui: Roact.Tree;
    private glowPath: Roact.Tree | undefined;
    private readinessIcons: Roact.Ref<ImageLabel>[];
    private static battleInstance: Battle;
    private static instance: BattleGUI;

    // Getters for the singleton instance and the battle instance
    static getBattle() {
        return BattleGUI.battleInstance;
    }

    static getInstance() {
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
        this.readinessIcons = this.initializeReadinessIcons(battle);
        this.ui = this.mountInitialUI();
    }

    // Initialize readiness icons with references
    private initializeReadinessIcons(battle: Battle): Roact.Ref<ImageLabel>[] {
        const readinessIcons = battle.getReadinessIcons();
        return readinessIcons.map(() => Roact.createRef<ImageLabel>());
    }

    // Mount the initial UI with readiness bar
    private mountInitialUI(): Roact.Tree {
        return Roact.mount(
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={BattleGUI.battleInstance.getReadinessIcons()} ref={this.readinessIcons} />
            </MenuFrameElement>
        );
    }

    // Enter movement mode and display sensitive cells
    enterMovement() {
        const sens = this.generateSensitiveCells();
        if (!sens || !BattleGUI.battleInstance) return;

        Roact.update(this.ui, this.renderWithSensitiveCells(sens));
    }

    // Exit movement mode and reset UI
    exitMovement() {
        if (!BattleGUI.battleInstance) return;
        Roact.update(this.ui, this.renderWithReadinessBar());
    }

    // Render the UI with readiness bar and sensitive cells
    private renderWithSensitiveCells(sens: Roact.Element) {
        return (
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={BattleGUI.battleInstance.getReadinessIcons()} ref={this.readinessIcons} />
                {sens}
            </MenuFrameElement>
        );
    }

    // Render the UI with only the readiness bar
    private renderWithReadinessBar() {
        return (
            <MenuFrameElement transparency={1}>
                <ReadinessBarElement icons={BattleGUI.battleInstance.getReadinessIcons()} ref={this.readinessIcons} />
            </MenuFrameElement>
        );
    }

    // Generate sensitive cells for movement
    private generateSensitiveCells() {
        const battle = BattleGUI.battleInstance;
        if (!battle) return;

        let currentPath: Vector2[] | undefined;
        return <>
            {battle.grid.cells.map((c) => (
                <CellSurfaceElement
                    cell={c}
                    onEnter={() => currentPath = this.handleCellEnter(c)}
                    onclick={() => {
                        if (currentPath) this.handleCellClick(c, currentPath);
                    }}
                />
            ))}
        </>;
    }

    // Handle cell hover (enter) event
    private handleCellEnter(cell: Cell) {
        const battle = BattleGUI.battleInstance;
        if (!battle?.currentRound) return;

        const path = Pathfinding.Start({
            grid: battle.grid,
            start: battle.currentRound.entity.cell!.xy,
            dest: cell.xy,
        });

        return this.glowAlongPath(path.fullPath);
    }

    // Handle cell click event
    private handleCellClick(cell: Cell, path: Vector2[]) {
        const battle = BattleGUI.battleInstance;
        if (!(battle?.currentRound)) return;

        const cr = battle.currentRound!;
        const entity = cr.entity;
        this.exitMovement();
        entity.moveToCell(cell, path).then(() => {
            if (this.glowPath) Roact.unmount(this.glowPath);

            this.tweenToUpdateReadiness();
            cr.resolve(entity);
        });
    }

    // Animate the readiness bar update
    tweenToUpdateReadiness() {
        const newReadinessIcons = BattleGUI.battleInstance.getReadinessIcons();
        const promises = this.readinessIcons.map((iconRef, i) => {
            const icon = iconRef.getValue();
            if (!icon) return Promise.resolve();

            const tween = TweenService.Create(
                icon,
                new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { Position: UDim2.fromScale(0, newReadinessIcons[i].readiness) }
            );

            tween.Play();
            return new Promise((resolve) => tween.Completed.Connect(resolve));
        });

        return Promise.all(promises);
    }

    // Highlight the cells along a path
    glowAlongPath(path: Vector2[]) {
        const elements = path.mapFiltered((xy) => {
            const cell = BattleGUI.battleInstance.grid.getCell(xy.X, xy.Y);
            if (!cell) return;

            cell.glow = true;
            return <CellGlowSurfaceElement cell={cell} />;
        });

        if (this.glowPath) {
            Roact.update(this.glowPath, <>{elements}</>);
        } else {
            this.glowPath = Roact.mount(<>{elements}</>);
        }

        return path;
    }

    // Display entity action options and handle the chosen action
    showEntityActionOptions(entity: Entity, callback?: (action: EntityActionOptions) => void) {
        const actions = entity.getActions();
        const actionOptions = actions.map((action, index) => (
            <ButtonElement
                Key={index}
                position={index / actions.size()}
                size={1 / actions.size()}
                onclick={() => this.handleActionClick(action.action, action.type, actionsUI, callback)}
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
}

