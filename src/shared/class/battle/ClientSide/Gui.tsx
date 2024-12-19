import React from "@rbxts/react";
import { Players } from "@rbxts/services";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, CellGlowSurfaceElement, CellSurfaceElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { BATTLE_ABILITYSLOT_TAG, BATTLE_ACTIONMENU_TAG, BATTLE_GLOW_TAG, BATTLE_MAINGUI_TAG, BATTLE_OTHERTURN_TAG, DECAL_OUTOFRANGE, DECAL_WITHINRANGE, MOVEMENT_COST } from "shared/const";
import { CharacterMenuAction, MainUIModes, ReadinessIcon } from "shared/types/battle-types";
import Ability from "../Ability";
import Entity from "../Entity";
import HexCell from "../Hex/Cell";
import HexGrid from "../Hex/Grid";
import Pathfinding from "../Pathfinding";

export default class Gui {

    // Singleton pattern to connect the BattleGUI with the Battle instance
    static Connect(icons: ReadinessIcon[], grid: HexGrid) {
        const ui = new Gui(icons, grid);
        // remoteEventsMap["GuiStart"].FireAllClients(icons); // temp, should use icons playerID
        return ui
    }

    // Private constructor to prevent direct instantiation
    private constructor(icons: ReadinessIcon[], grid: HexGrid) {
        this.mountInitialUI(icons);
        // const glowUpCellsEvent = bindableEventsMap["GlowUpCells"] as BindableEvent;
        // if (glowUpCellsEvent) {
        //     glowUpCellsEvent.Event.Connect((vecs: Vector2[]) => {
        //         const cells = vecs.mapFiltered((qr) => grid.getCell(qr));
        //         this.mountOrUpdateGlow(cells);
        //     });
        // }
    }

    /**
     * Updating main UI with a specific mode
     *  * `onlyReadinessBar`: only the readiness bar is shown
     *  * `withSensitiveCells`: the readiness bar and the sensitive cells (surfacegui on cells)
     * 
     * @param mode 
     * @returns the updated React tree
     */
    updateMainUI(mode: 'withSensitiveCells', props: { readinessIcons: ReadinessIcon[], cre: Entity, grid: HexGrid }): void;
    updateMainUI(mode: 'onlyReadinessBar', props: { readinessIcons: ReadinessIcon[] }): void;
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
                GuiMothership.mount(
                    BATTLE_MAINGUI_TAG,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={props.readinessIcons} />
                    </MenuFrameElement>);
                break;
            case 'withSensitiveCells':
                if (!props.cre || !props.grid || !props.readinessIcons) {
                    warn(`No entity, grid or readiness icons provided for mode: ${mode}`);
                    return;
                }
                GuiMothership.mount(
                    BATTLE_MAINGUI_TAG,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={props.readinessIcons} />
                        {this.createSensitiveCellElements(props.cre, props.grid)}
                    </MenuFrameElement>);
                break;
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
        GuiMothership.mount(
            BATTLE_ACTIONMENU_TAG,
            <MenuFrameElement key={"ActionMenu"} transparency={1} >
                <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)} >
                    {
                        actions.map((action, index) => (
                            <ButtonElement
                                key={action.type}
                                position={index / actions.size()}
                                size={1 / actions.size()}
                                onclick={() => {
                                    action.run()
                                }}
                                text={action.type}
                                transparency={0.9}
                            />
                        ))}
                </ButtonFrameElement>
            </MenuFrameElement>);
    }
    /**
     * Mount the initial UI, which contains the MenuFrameElement and the ReadinessBar
     * @returns the mounted Tree
     */
    mountInitialUI(icons: ReadinessIcon[]) {
        GuiMothership.mount(BATTLE_MAINGUI_TAG,
            <MenuFrameElement key={`BattleUI`} transparency={1} >
                <ReadinessBar icons={icons} />
            </MenuFrameElement>);
    }
    // Highlight the cells along a path
    mountOrUpdateGlow(cell: HexCell, range: NumberRange): HexCell[] | undefined
    mountOrUpdateGlow(path: HexCell[]): HexCell[] | undefined
    mountOrUpdateGlow(_cells: HexCell[] | HexCell, range?: NumberRange) {
        const cellsToGlow = _cells instanceof HexCell ? _cells.findCellsWithinRange(range!) : _cells;
        const elements = cellsToGlow.mapFiltered((cell) => <CellGlowSurfaceElement cell={cell} />);

        GuiMothership.mount(BATTLE_GLOW_TAG, <frame key={'GlowingPath'}>{elements}</frame>)

        return cellsToGlow;
    }

    mountOtherPlayersTurnGui() {
        GuiMothership.mount(BATTLE_OTHERTURN_TAG, <OPTElement />);
    }

    mountAbilitySlots(cre: Entity) {
        const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
        if (!mountingAbilitySet) {
            warn("No ability set found for entity");
            return;
        }
        GuiMothership.mount(BATTLE_ABILITYSLOT_TAG,
            <AbilitySetElement>
                <AbilitySlotsElement cre={cre} gui={this} abilitySet={mountingAbilitySet} />
            </AbilitySetElement>);
    }

    unmountAndClear(propertyName: keyof this): void {
        const property = this[propertyName];
        if (property !== undefined && typeOf(property) === 'table') {
            print(`Unmounting and clearing: ${propertyName as string}`);
            const [s, f] = pcall(() => {
                (property as ReactRoblox.Root).unmount();
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
    private createSensitiveCellElements(cre: Entity, grid: HexGrid): React.Element | undefined {
        return <frame>
            {
                grid.cells.map((c) => (
                    <CellSurfaceElement
                        cell={c}
                        onEnter={() => this.handleCellEnter(cre, c)}
                        onclick={() => this.handleCellClick(cre, c)
                        }
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
                limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.mountOrUpdateGlow(path.mapFiltered((qr) => enteringCell.grid.getCell(qr)));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.get('pos') - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
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
                // remoteEvent_Attack.FireServer(ability.getState());
            }
        }
    }

    private clickedOnEmptyCell(cre: Entity, cell: HexCell) {
        if (cre.cell) {
            const pf = new Pathfinding({
                grid: cell.grid,
                start: cre.cell.qr(),
                dest: cell.qr(),
                limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            const path = pf?.begin();
            return cre.moveToCell(cell, path.mapFiltered((qr) => cell.grid.getCell(qr)));
        }
        else {
            return Promise.resolve();
        }
    }
    //#endregion

    //#region Clearing Methods

    public clearAll() {
        this.clearAllLooseGui();
        this.clearAllLooseScript();
    }

    public clearAllLooseGui() {
        GuiMothership.unmount([BATTLE_ABILITYSLOT_TAG, BATTLE_ACTIONMENU_TAG, BATTLE_GLOW_TAG, BATTLE_OTHERTURN_TAG]);
    }

    public clearAllLooseScript() {
    }
    //#endregion
}
