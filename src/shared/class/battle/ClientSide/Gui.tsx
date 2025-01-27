import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { Players } from "@rbxts/services";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, CellGlowSurfaceElement, CellSurfaceElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import HPBar from "gui_sharedfirst/new_components/battle/statusBar/hpBar";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag, MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { AccessToken, ActionType, AttackAction, CharacterMenuAction, MainUIModes, MoveAction, PlayerID, ReadinessIcon, Reality, UpdateMainUIConfig } from "shared/types/battle-types";
import { calculateRealityValue } from "shared/utils";
import Pathfinding from "../Pathfinding";
import State from "../State";
import Entity from "../State/Entity";
import HexCellGraphics from "../State/Hex/Cell/Graphics";
import EntityHexCellGraphicsMothership from "./EHCG/Mothership";
import EntityCellGraphicsTuple from "./EHCG/Tuple";

export default class Gui {
    // Singleton pattern to connect the BattleGUI with the Battle instance
    static Connect(icons: ReadinessIcon[]) {
        const ui = new Gui(icons);
        return ui
    }

    private localReadinessMap: Record<PlayerID, Atom<number>> = {};

    // Private constructor to prevent direct instantiation
    private constructor(icons: ReadinessIcon[]) {
        icons.forEach((icon) => {
            this.localReadinessMap[icon.playerID] = icon.readiness;
        });
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
        const localPlayerID = Players.LocalPlayer.UserId;
        const localEntity = props.state?.findEntity(localPlayerID);
        const hpBar = localEntity ?
            <HPBar hp={localEntity.getState('hip')} maxHP={calculateRealityValue(Reality.HP, localEntity.stats)} /> : undefined;
        const { readinessIcons, state, EHCGMS, accessToken } = props;
        if (props.readinessIcons) {
            props.readinessIcons.forEach((icon) => {
                this.localReadinessMap[icon.playerID] = icon.readiness;
            });
        }

        switch (mode) {
            case 'onlyReadinessBar':
                assert(readinessIcons, `No readiness icons provided for mode: ${mode}`);
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                        {hpBar}
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
                        {hpBar}
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
    mountInitialUI(readinessIcons: ReadinessIcon[]) {
        this.updateMainUI('onlyReadinessBar', { readinessIcons });
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
                        cell={t.cellGraphics}
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
        const currentQR = state.getCREPosition();
        assert(currentQR, "Current QR is not defined");
        const currentCell = state.grid.getCell(currentQR);
        assert(currentCell, "Current cell is not defined");
        const oe = state.findEntity(tuple.cellGraphics.qrs);
        const oeG = tuple.entityGraphics
        const cre = state.findEntity(currentQR);
        assert(cre, `Entity is not defined @${currentQR}`);
        const creG = EHCGMS.findTupleByEntity(cre)?.entityGraphics;
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
                inrange.mapFiltered((cell) => EHCGMS.positionTuple(cell.qr())).forEach(t => glowHexCells.push(t.cellGraphics))
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
                dest: tuple.cellGraphics.qr,
                // limit: math.floor(cre.get('pos') / MOVEMENT_COST),
                hexagonal: true,
            })
            if (!pf) return;
            const path = pf.begin();
            return this.mountOrUpdateGlow(path.mapFiltered((qr) => EHCGMS.positionTuple(qr).cellGraphics));
        }

        // 2. Move readiness icon to forecast post-move position
        // const readinessPercent = (cre.get('pos') - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
        // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

    }
    /**
     * Handles the click event on a cell within the battle GUI.
     *
     * @param cre - The entity that initiated the click event.
     * @param clickedtuple - The cell that was clicked.
     */
    private handleCellClick(props: UpdateMainUIConfig, clickedtuple: EntityCellGraphicsTuple) {
        print("Cell clicked", clickedtuple);
        if (clickedtuple.entityGraphics) {
            print(props.state)
            const clickedOnEntity = props.state.findEntity(clickedtuple.cellGraphics.qr);
            assert(clickedOnEntity, "Clicked on entity is not defined");
            this.clickedOnEntity(props, clickedOnEntity, props.accessToken);
        }
        else {
            this.clickedOnEmptyCell(props, clickedtuple, props.accessToken);
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
    private clickedOnEntity(props: UpdateMainUIConfig, clickedOn: Entity, accessToken: AccessToken) {
        print("Clicked on entity", clickedOn);
        const { state } = props;
        const cre = state.getCRE();
        assert(cre, "Current entity is not defined");

        if (!cre.armed) return;

        const keyed = cre.armed;
        const iability = cre.getEquippedAbilitySet()[keyed];
        if (!iability) {
            warn("No ability keyed");
            return;
        }
        accessToken.action = {
            type: ActionType.Attack,
            ability: {
                ...iability,
                using: cre.info(),
                target: clickedOn.info(),
            },
            by: cre.playerID,
            against: clickedOn.playerID,
            executed: false,
        } as AttackAction
        remotes.battle.act(accessToken);
    }

    private async clickedOnEmptyCell(props: UpdateMainUIConfig, emptyTuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        print("Clicked on empty cell", emptyTuple);
        const { state } = props;
        const start = state.getCREPosition();
        assert(start, "Start position is not defined");
        const dest = emptyTuple.cellGraphics.qr;
        await this.commiteMoveAction(props, accessToken, start, dest);
    }
    //#endregion

    //#region Communicate with the server

    private async commiteMoveAction(mainUIConfig: UpdateMainUIConfig, ac: AccessToken, start: Vector2, dest: Vector2) {
        this.updateMainUI('onlyReadinessBar', mainUIConfig);
        const readinessIcon = this.localReadinessMap[ac.userId];
        const action = {
            type: ActionType.Move,
            executed: false,
            by: ac.userId,
            to: dest,
            from: start,
        } as MoveAction;
        if (readinessIcon) {
            const distance = mainUIConfig.state.findDistance(start, dest);
            print(`localreadinessIcon: ${readinessIcon()} => ${readinessIcon() - distance * MOVEMENT_COST}`);
            readinessIcon(readinessIcon() - distance * MOVEMENT_COST)
        }
        const res = await this.commitAction({
            ...ac,
            action
        });
        this.updateMainUI('withSensitiveCells', mainUIConfig);
        return res
    }

    private async commitAction(ac: AccessToken) {
        print("Committing action", ac);
        const res = await remotes.battle.act(ac);
        return res;
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
