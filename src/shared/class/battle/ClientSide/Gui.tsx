import React from "@rbxts/react";
import { Players } from "@rbxts/services";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, CellGlowSurfaceElement, CellSurfaceElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag, MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, CharacterMenuAction, MainUIModes, MoveAction, ReadinessIcon, UpdateMainUIConfig } from "shared/types/battle-types";
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
    updateMainUI(mode: 'withSensitiveCells', props: UpdateMainUIConfig): void;
    updateMainUI(mode: 'onlyReadinessBar', props: UpdateMainUIConfig): void;
    updateMainUI(mode: MainUIModes, props: UpdateMainUIConfig) {
        const { readinessIcons, cre, grid, accessToken } = props
        print(`Updating main UI with mode: ${mode}`, props);
        switch (mode) {
            case 'onlyReadinessBar':
                if (!readinessIcons) {
                    warn(`No readiness icons provided for mode: ${mode}`);
                    return;
                }
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                    </MenuFrameElement>);
                break;
            case 'withSensitiveCells':
                if (!cre || !grid || !readinessIcons) {
                    warn(`No entity, grid or readiness icons provided for mode: ${mode}`);
                    return;
                }
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                        {this.createSensitiveCellElements(props)}
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
        GuiMothership.mount(
            GuiTag.ActionMenu,
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
        GuiMothership.mount(GuiTag.MainGui,
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

        GuiMothership.mount(GuiTag.Glow, <frame key={'GlowingPath'}>{elements}</frame>)

        return cellsToGlow;
    }

    mountOtherPlayersTurnGui() {
        GuiMothership.mount(GuiTag.OtherTurn, <OPTElement />);
    }

    mountAbilitySlots(cre: Entity) {
        const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
        if (!mountingAbilitySet) {
            warn("No ability set found for entity");
            return;
        }
        GuiMothership.mount(GuiTag.AbilitySlot,
            <AbilitySetElement>
                <AbilitySlotsElement cre={cre} gui={this} abilitySet={mountingAbilitySet} />
            </AbilitySetElement>);
    }


    unmountAndClear(tag: GuiTag) {
        GuiMothership.unmount(tag);
    }
    //#endregion

    //#region HexCell Methods
    /**
     * Get cell elements that are sensitive to mouse hover
     * @returns 
     */
    private createSensitiveCellElements(props: UpdateMainUIConfig): React.Element | undefined {
        return <frame key={'SensitiveCells'}>
            {
                props.grid!.cells.map((c) => {
                    // print(c);
                    return <CellSurfaceElement
                        cell={c}
                        onEnter={() => this.handleCellEnter(props, c)}
                        onclick={() => this.handleCellClick(props, c)}
                    />
                })}
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
    private handleCellEnter({ cre, entities }: UpdateMainUIConfig, enteringCell: HexCell) {
        assert(cre, "Entity is not defined");
        assert(entities, "Entities are not defined");
        assert(cre.cell, "Entity has no cell");

        const currentCell = cre.cell;
        const occupyingEntity = enteringCell.entity ? entities.find(e => e.playerID === enteringCell.entity) : undefined;

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (cre.armed && occupyingEntity) {
            cre.faceEntity(occupyingEntity);
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
                grid: enteringCell.gridRef,
                start: currentCell.qr(),
                dest: enteringCell.qr(),
                limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.mountOrUpdateGlow(path.mapFiltered((qr) => enteringCell.gridRef.getCell(qr)));
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
    private handleCellClick({ cre, entities, accessToken }: UpdateMainUIConfig, clickedCell: HexCell) {
        assert(cre, "Entity is not defined");
        if (clickedCell.isVacant()) {
            this.clickedOnEmptyCell(cre, clickedCell, accessToken);
        }
        else {
            this.clickedOnEntity(cre, clickedCell, accessToken);
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
    private clickedOnEntity(cre: Entity, clickedOnCell: HexCell, accessToken: AccessToken) {
        if (cre.armed) {
            const keyed = cre.armed;
            const iability = cre.getEquippedAbilitySet()[keyed];
            //#region
            if (!iability) {
                warn(`clickedOnEntity: ${keyed} has no ability keyed`)
                return;
            }
            if (!cre.cell) {
                warn("clickedOnEntity: Current entity has no cell");
                return;
            }
            //#endregion
            if (clickedOnCell.isWithinRangeOf(cre.cell, iability.range)) {
                // const ability = new Ability({
                //     ...iability,
                //     using: cre,
                //     target: entity,
                // });
                // remoteEvent_Attack.FireServer(ability.getState());
            }
        }
    }

    private clickedOnEmptyCell(cre: Entity, cell: HexCell, accessToken: AccessToken) {
        if (cre.cell) {
            const start = cre.cell.qr();
            const dest = cell.qr();
            const pf = new Pathfinding({
                grid: cell.gridRef,
                start,
                dest,
                limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            const path = pf?.begin();
            cre.moveToCell(cell, path.mapFiltered((qr) => cell.gridRef.getCell(qr))).then(() => {
                accessToken.newState = cell.gridRef.info();
                const ourAction = accessToken.action as MoveAction;
                ourAction.to = dest
                ourAction.from = start;
                remotes.battle.act(accessToken);
            })
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
        for (const [x, tag] of pairs(GuiTag)) {
            GuiMothership.unmount(tag);
        }
    }

    public clearAllLooseScript() {
    }
    //#endregion
}
