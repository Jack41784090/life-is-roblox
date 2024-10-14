import Roact, { Portal } from "@rbxts/roact";
import { Players, TweenService } from "@rbxts/services";
import AbilitySetElement from "gui_sharedfirst/components/battle/ability-set-gui";
import AbilitySlotsElement from "gui_sharedfirst/components/battle/ability-slots";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readiness-bar";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, MOVEMENT_COST } from "shared/const";
import { CharacterMenuAction, ReadinessIcon } from "shared/types/battle-types";
import { getPlayer } from "shared/utils";
import { bindableEventsMap, remoteEventsMap } from "shared/utils/events";
import Pathfinding from "./Pathfinding";
import Ability from "./system/Ability";
import Entity from "./system/Entity";
import HexCell from "./system/hex/HexCell";
import HexGrid from "./system/hex/HexGrid";

type MainUIModes = 'onlyReadinessBar' | 'withSensitiveCells';

export default class BattleGUI {
    private mainGui: Roact.Tree;
    actionsGui: Roact.Tree | undefined;
    dropDownMenuGui: Roact.Tree | undefined;
    glowPathGui: Roact.Tree | undefined;
    abilitySlotGui: Roact.Tree | undefined;

    // Singleton pattern to connect the BattleGUI with the Battle instance
    static Connect(icons: ReadinessIcon[], grid: HexGrid) {
        const ui = new BattleGUI(icons, grid);
        // remoteEventsMap["GuiStart"].FireAllClients(icons); // temp, should use icons playerID
        return ui
    }

    // Private constructor to prevent direct instantiation
    private constructor(icons: ReadinessIcon[], grid: HexGrid) {
        this.mainGui = this.mountInitialUI(icons);
        const glowUpCellsEvent = bindableEventsMap["GlowUpCells"] as BindableEvent;
        if (glowUpCellsEvent) {
            glowUpCellsEvent.Event.Connect((vecs: Vector2[]) => {
                const cells = vecs.mapFiltered((qr) => grid.getCell(qr));
                this.mountOrUpdateGlow(cells);
            });
        }

        this.readinessIconMap = new Map(icons.map((icon) => {
            const ref = Roact.createRef<Frame>();
            return [icon.iconID, ref];
        }));
    }

    /**
     * Updating main UI with a specific mode
     *  * `onlyReadinessBar`: only the readiness bar is shown
     *  * `withSensitiveCells`: the readiness bar and the sensitive cells (surfacegui on cells)
     * 
     * @param mode 
     * @returns the updated Roact tree
     */
    updateMainUI(mode: 'withSensitiveCells', props: { readinessIcons: ReadinessIcon[], cre: Entity, grid: HexGrid }): Roact.Tree;
    updateMainUI(mode: 'onlyReadinessBar', props: { readinessIcons: ReadinessIcon[] }): Roact.Tree;
    updateMainUI(mode: MainUIModes, props: {
        readinessIcons?: ReadinessIcon[]
        cre?: Entity
        grid?: HexGrid
    } = {}) {
        print(`Updating main UI with mode: ${mode}`);
        switch (mode) {
            case 'onlyReadinessBar':
                if (!props.readinessIcons) {
                    warn(`No readiness icons provided for mode: ${mode}`);
                    return;
                }
                return Roact.update(this.mainGui,
                    <MenuFrameElement transparency={1} Key={`BattleUI`}>
                        <ReadinessBarElement icons={props.readinessIcons} ref={this.readinessIconMap} />
                    </MenuFrameElement>);
            case 'withSensitiveCells':
                if (!props.cre || !props.grid || !props.readinessIcons) {
                    warn(`No entity, grid or readiness icons provided for mode: ${mode}`);
                    return;
                }
                return Roact.update(this.mainGui,
                    <MenuFrameElement transparency={1} Key={`BattleUI`}>
                        <ReadinessBarElement icons={props.readinessIcons} ref={this.readinessIconMap} />
                        {this.createSensitiveCellElements(props.cre, props.grid)}
                    </MenuFrameElement>);
        }
    }

    //#region UI Mounting Methods
    /**
     * Mounts action menu
     * Action Menu: a menu that shows the available actions for the entity's turn (e.g. go into move mode, items, end turn)
     * 
     * @param actions 
     * @returns 
     */
    mountActionMenu(actions: CharacterMenuAction[]) {
        print("Mounting action menu");
        this.unmountAndClear('actionsGui');
        this.actionsGui = Roact.mount(
            <MenuFrameElement transparency={1}>
                <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)}>
                    {actions.map((action, index) => (
                        <ButtonElement
                            Key={action.type}
                            position={index / actions.size()}
                            size={1 / actions.size()}
                            onclick={() => {
                                if (this.actionsGui) action.run(this.actionsGui)
                            }}
                            text={action.type}
                            transparency={0.9}
                        />
                    ))}
                </ButtonFrameElement>
            </MenuFrameElement>);
        return this.actionsGui;
    }
    /**
     * Mount the initial UI, which contains the MenuFrameElement and the ReadinessBarElement
     * @returns the mounted Tree
     */
    mountInitialUI(icons: ReadinessIcon[]): Roact.Tree {
        return Roact.mount(
            <MenuFrameElement Key={`BattleUI`} transparency={1}>
                <ReadinessBarElement icons={icons} ref={this.readinessIconMap} />
            </MenuFrameElement>
        );
    }
    // Highlight the cells along a path
    mountOrUpdateGlow(cell: HexCell, range: NumberRange): HexCell[] | undefined
    mountOrUpdateGlow(path: HexCell[]): HexCell[] | undefined
    mountOrUpdateGlow(_cells: HexCell[] | HexCell, range?: NumberRange) {
        const cellsToGlow = _cells instanceof HexCell ? _cells.findCellsWithinRange(range!) : _cells;
        const elements = cellsToGlow.mapFiltered((cell) => <CellGlowSurfaceElement cell={cell} />);
        const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");
        if (!playerGUI) return;

        if (playerGUI && this.glowPathGui) {
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

        return cellsToGlow;
    }

    mountAbilitySlots(cre: Entity) {
        const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
        //#region 
        if (!mountingAbilitySet) {
            warn("No ability set found for entity");
            return;
        }
        //#endregion
        this.unmountAndClear('abilitySlotGui');
        this.abilitySlotGui = Roact.mount(
            <AbilitySetElement>
                <AbilitySlotsElement cre={cre} gui={this} abilitySet={mountingAbilitySet} />
            </AbilitySetElement>
        );
    }

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

    //#region HexCell Methods
    /**
     * Get cell elements that are sensitive to mouse hover
     * @returns 
     */
    private createSensitiveCellElements(cre: Entity, grid: HexGrid): Roact.Element | undefined {
        return <frame>
            {grid.cells.map((c) => (
                <CellSurfaceElement
                    cell={c}
                    onEnter={() => this.handleCellEnter(cre, c)}
                    onclick={() => this.handleCellClick(cre, c)}
                />
            ))}
        </frame>;
    }
    /**
     * Handles the event when an entity enters a new cell.
     *
     * @param cre - The entity that is entering the cell.
     * @param enteringCell - The cell that the entity is entering.
     *
     * This function performs the following actions:
     * 1. Changes the mouse icon based on whether the cell is vacant and within range.
     * 2. If the entity is armed and the cell is not vacant, it faces the entity in the cell and updates the mouse icon based on the ability range.
     * 3. If the cell is within range, it mounts or updates the glow effect.
     * 4. If the cell is out of range, it mounts or updates the glow effect with a different icon.
     * 5. If the cell is vacant, it performs pathfinding to the cell and mounts or updates the glow effect along the path.
     */
    private handleCellEnter(cre: Entity, enteringCell: HexCell) {
        const currentCell = cre.cell;
        if (!currentCell) return;

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (cre.armed && !enteringCell.isVacant()) {
            cre.faceEntity(enteringCell.entity!);
            const ability = cre.getEquippedAbilitySet()[cre.armed];
            if (!ability) {
                mouse.Icon = '';
                return;
            }
            else if (enteringCell.isWithinRangeOf(currentCell, ability.range)) {
                mouse.Icon = DECAL_WITHINRANGE;
                return this.mountOrUpdateGlow(currentCell, ability.range);
            }
            else {
                mouse.Icon = DECAL_OUTOFRANGE;
                return this.mountOrUpdateGlow(currentCell, ability.range);
            }
        }
        else {
            mouse.Icon = ''
            const pf = new Pathfinding({
                grid: enteringCell.grid,
                start: currentCell.qr(),
                dest: enteringCell.qr(),
                limit: math.floor(cre.pos / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.mountOrUpdateGlow(path.mapFiltered((qr) => enteringCell.grid.getCell(qr)));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.pos - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

    }
    /**
     * Handles the click event on a cell within the battle GUI.
     *
     * @param cre - The entity that initiated the click event.
     * @param clickedCell - The cell that was clicked.
     */
    private handleCellClick(cre: Entity, clickedCell: HexCell) {
        if (clickedCell.isVacant()) {
            this.clickedOnEmptyCell(cre, clickedCell);
        }
        else {
            const entityClicked = clickedCell.entity!;
            this.clickedOnEntity(cre, entityClicked);
        }
    }
    /**
     * Handles the event when an entity is clicked.
     * 
     * @param cre - The current entity that is performing the click action.
     * @param entity - The target entity that is being clicked on.
     * 
     * This method checks if the current entity (`cre`) is armed and has an ability equipped.
     * If the ability is found and both entities have valid cells, it checks if the target entity
     * is within the range of the ability. If all conditions are met, it creates a new `Ability`
     * instance and fires the `onAttackClickedSignal` with the created ability.
     * 
     * Warnings are logged if:
     * - The current entity has no ability keyed.
     * - The target entity has no cell.
     * - The current entity has no cell.
     */
    private clickedOnEntity(cre: Entity, entity: Entity) {
        if (cre.armed) {
            const keyed = cre.armed;
            const iability = cre.getEquippedAbilitySet()[keyed];
            //#region
            if (!iability) {
                warn(`clickedOnEntity: ${keyed} has no ability keyed`)
                return;
            }
            if (!entity.cell) {
                warn("clickedOnEntity: Entity has no cell");
                return;
            }
            if (!cre.cell) {
                warn("clickedOnEntity: Current entity has no cell");
                return;
            }
            //#endregion
            if (entity.cell.isWithinRangeOf(cre.cell, iability.range)) {
                const ability = new Ability({
                    ...iability,
                    using: cre,
                    target: entity,
                });
                remoteEventsMap["Attack"].FireServer(ability);
            }
        }
    }

    private clickedOnEmptyCell(cre: Entity, cell: HexCell) {
        if (cre.cell) {
            const pf = new Pathfinding({
                grid: cell.grid,
                start: cre.cell.qr(),
                dest: cell.qr(),
                limit: math.floor(cre.pos / MOVEMENT_COST),
                hexagonal: true,
            })
            const path = pf?.begin();
            return cre.moveToCell(cell, path)
        }
        else {
            return Promise.resolve();
        }
    }
    //#endregion

    //#region Readiness Bar Methods
    readinessIconMap: Map<number, Roact.Ref<Frame>>;

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
    tweenToUpdateReadiness(newReadinessIcons: ReadinessIcon[]) {
        print("Tweening to update readiness");
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

    //#region Clearing Methods

    clearAllLooseGui() {
        if (this.actionsGui) {
            this.unmountAndClear('actionsGui');
        }
        if (this.dropDownMenuGui) {
            this.unmountAndClear('dropDownMenuGui');
        }
        if (this.glowPathGui) {
            this.unmountAndClear('glowPathGui');
        }
    }

    clearAllLooseScript() {
    }
    //#endregion
}
