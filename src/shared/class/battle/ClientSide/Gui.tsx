import React from "@rbxts/react";
import { Players } from "@rbxts/services";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, CellGlowSurfaceElement, CellSurfaceElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, CharacterMenuAction, MainUIModes, MoveAction, ReadinessIcon, UpdateMainUIConfig } from "shared/types/battle-types";
import Entity from "../Entity";
import HexCell from "../Hex/Cell";
import HexCellGraphics from "../Hex/Cell/Graphics";
import HexGrid from "../Hex/Grid";
import Pathfinding from "../Pathfinding";
import State from "../State";
import EntityHexCellGraphicsMothership from "./EHCG/Mothership";
import EntityCellGraphicsTuple from "./EHCG/Tuple";

export default class Gui {

    // Singleton pattern to connect the BattleGUI with the Battle instance
    static Connect(icons: ReadinessIcon[], grid: HexGrid) {
        const ui = new Gui(icons, grid);
        return ui
    }

    // Private constructor to prevent direct instantiation
    private constructor(icons: ReadinessIcon[], grid: HexGrid) {
        this.mountInitialUI(icons);
    }

    /**
     * Updating main UI with a specific mode
     *  * `onlyReadinessBar`: only the readiness bar is shown
     *  * `withSensitiveCells`: the readiness bar and the sensitive cells (surfacegui on cells)
     * 
     * @param mode 
     * @returns the updated React tree
     */
    updateMainUI(mode: 'withSensitiveCells', props: { accessToken: AccessToken, readinessIcons: ReadinessIcon[], state: State, EHCGMS: EntityHexCellGraphicsMothership }): void;
    updateMainUI(mode: 'onlyReadinessBar', props: { readinessIcons: ReadinessIcon[] }): void;
    updateMainUI(mode: MainUIModes, props: Partial<UpdateMainUIConfig>) {
        print(`Updating main UI with mode: ${mode}`, props);
        const { readinessIcons, state, EHCGMS, accessToken } = props;
        switch (mode) {
            case 'onlyReadinessBar':
                assert(readinessIcons, `No readiness icons provided for mode: ${mode}`);
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                    </MenuFrameElement>);
                break;
            case 'withSensitiveCells':
                assert(state, `State is not defined for mode: ${mode}`);
                assert(EHCGMS, `EntityHexCellGraphicsMothership is not defined for mode: ${mode}`);
                assert(readinessIcons, `Readiness icons are not defined for mode: ${mode}`);
                assert(accessToken, `Access token is not defined for mode: ${mode}`);
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                        {this.createSensitiveCellElements({ state, EHCGMS, readinessIcons, accessToken })}
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
                    {actions.map((action, index) => (
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
        this.updateMainUI('onlyReadinessBar', { readinessIcons: icons });
    }
    // Highlight the cells along a path
    mountOrUpdateGlow(cellsToGlow: HexCellGraphics[]): HexCellGraphics[] | undefined {
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
                props.EHCGMS.tuples().map((t) => {
                    // print(c);
                    return <CellSurfaceElement
                        cell={t.cell}
                        onEnter={() => this.handleCellEnter(props, t)}
                        onclick={() => this.handleCellClick(props, t)}
                    />
                })}
        </frame>;
    }
    /**
     * Handles the event when an entity enters a new cell.
     *
     * @param cre - The entity that is entering the cell.
     * @param tuple - The cell that the entity is entering.
     *
     * This function performs the following actions:
     * 1. Changes the mouse icon based on whether the cell is vacant and within range.
     * 2. If the entity is armed and the cell is not vacant, it faces the entity in the cell and updates the mouse icon based on the ability range.
     * 3. If the cell is within range, it mounts or updates the glow effect.
     * 4. If the cell is out of range, it mounts or updates the glow effect with a different icon.
     * 5. If the cell is vacant, it performs pathfinding to the cell and mounts or updates the glow effect along the path.
     */
    private handleCellEnter({ state, EHCGMS }: UpdateMainUIConfig, tuple: EntityCellGraphicsTuple) {
        const currentQR = state.findCREPosition();
        assert(currentQR, "Current QR is not defined");
        const currentCell = state.grid.getCell(currentQR);
        assert(currentCell, "Current cell is not defined");
        const oe = state.findEntity(tuple.cell.qrs);
        const oeG = tuple.entity
        const cre = state.findEntity(currentQR);
        assert(cre, `Entity is not defined @${currentQR}`);
        const creG = EHCGMS.findTupleByEntity(cre)?.entity;
        assert(creG, "EntityGraphics is not defined");

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (cre.armed && oe?.qr && oeG) {
            creG.faceEntity(oeG);
            const ability = cre.getEquippedAbilitySet()[cre.armed];
            const glowHexCells = [] as HexCellGraphics[];
            if (ability) {
                if (state.grid.getCell(oe.qr)?.isWithinRangeOf(currentCell, ability.range)) {
                    mouse.Icon = DECAL_WITHINRANGE;
                }
                else {
                    mouse.Icon = DECAL_OUTOFRANGE;
                }
                const inrange = currentCell.findCellsWithinRange(ability.range);
                inrange.mapFiltered((cell) => EHCGMS.positionTuple(cell.qr())).forEach(t => glowHexCells.push(t.cell))
            }
            else {
                mouse.Icon = '';
            }
            return this.mountOrUpdateGlow(glowHexCells);
        }
        else {
            // Hovering over an empty cell / CRE has no ability selected
            mouse.Icon = ''
            const pf = new Pathfinding({
                grid: state.grid,
                start: currentCell.qr(),
                dest: tuple.cell.qr,
                // limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.mountOrUpdateGlow(path.mapFiltered((qr) => EHCGMS.positionTuple(qr).cell));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.get('pos') - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

    }
    /**
     * Handles the click event on a cell within the battle GUI.
     *
     * @param cre - The entity that initiated the click event.
     * @param tuple - The cell that was clicked.
     */
    private handleCellClick(props: UpdateMainUIConfig, tuple: EntityCellGraphicsTuple) {
        if (tuple.entity) {
            // this.clickedOnEntity(cre, clickedCell, accessToken);
        }
        else {
            this.clickedOnEmptyCell(props, tuple, props.accessToken);
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
            // if (clickedOnCell.isWithinRangeOf(cre.cell, iability.range)) {
            // const ability = new Ability({
            //     ...iability,
            //     using: cre,
            //     target: entity,
            // });
            // remoteEvent_Attack.FireServer(ability.getState());
            // }
        }
    }

    private clickedOnEmptyCell(props: UpdateMainUIConfig, emptyTuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        const { state, EHCGMS } = props;
        const start = state.findCREPosition();
        assert(start, "Start position is not defined");
        const dest = emptyTuple.cell.qr;
        const pf = new Pathfinding({
            grid: state.grid,
            start,
            dest,
            // limit: math.floor(cre.get('pos') / MOVEMENT_COST),
            hexagonal: true,
        })
        const creG = EHCGMS.positionTuple(start).entity;
        assert(creG, "EntityGraphics is not at start position");

        this.updateMainUI('onlyReadinessBar', props);

        const destinationCellGraphics = EHCGMS.positionTuple(dest).cell;
        const path = pf?.begin().map(qr => EHCGMS.positionTuple(qr).cell);
        return creG.moveToCell(destinationCellGraphics, path).then(t => {
            const ourAction = accessToken.action as MoveAction;
            ourAction.to = dest
            ourAction.from = start;

            const cre = state.findEntity(start)
            assert(cre, "Entity is not defined");
            state.setCell(cre, dest.X, dest.Y);
            print('cre', cre)

            accessToken.newState = state.info();
            remotes.battle.act(accessToken).then(() => {
                this.updateMainUI('withSensitiveCells', props);
            });

            return t;
        });
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
