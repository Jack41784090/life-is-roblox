import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { Players } from "@rbxts/services";
import { t } from "@rbxts/t";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import CellGlowingSurface from "gui_sharedfirst/new_components/battle/cell/glow";
import CellSurface from "gui_sharedfirst/new_components/battle/cell/surface";
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar";
import PlayerPortrait from "gui_sharedfirst/new_components/battle/statusBar/playerPortrait";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { AccessToken, ActionType, CharacterMenuAction, MainUIModes, MoveAction, ReadinessIcon, Reality, UpdateMainUIConfig } from "shared/class/battle/types";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, GuiTag, MOVEMENT_COST } from "shared/const";
import remotes from "shared/remote";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import { NetworkService } from "../../Network/NetworkService";
import Pathfinding from "../../Pathfinding";
import State from "../../State";
import Entity from "../../State/Entity";
import { EntityState } from "../../State/Entity/types";
import HexCell from "../../State/Hex/Cell";
import HexCellGraphics from "../../State/Hex/Cell/Graphics";
import { UNIVERSAL_PHYS } from "../../Systems/CombatSystem/Ability/const";
import EntityHexCellGraphicsMothership from "../Graphics/Mothership";
import EntityCellGraphicsTuple from "../Graphics/Tuple";
import { GuiConfig } from "./types";

export default class BattleGui {
    private logger = Logger.createContextLogger("BattleGUI");
    private network: NetworkService;
    private eventBus: EventBus;
    private localReadinessMap = new Map<number, Atom<number>>();

    static Connect(config: GuiConfig) {
        const ui = new BattleGui(config);
        return ui
    }

    private constructor(config: GuiConfig) {
        this.network = config.networkService;
        this.eventBus = config.eventBus;
        const vars = t.array(t.interface({
            playerID: t.number,
            iconUrl: t.string,
            readiness: t.callback,
        }));
        this.eventBus.subscribe(GameEvent.READINESS_UPDATED, (readinessIconArray: unknown) => {
            const verification = vars(readinessIconArray);
            if (!verification) {
                this.logger.warn("Invalid readiness icon array", readinessIconArray as defined);
                return;
            }

            const icons = readinessIconArray as ReadinessIcon[];
            icons.forEach(i => {
                const existingIcon: Atom<number> | undefined = this.localReadinessMap.get(i.playerID);
                if (existingIcon) {
                    existingIcon(i.readiness)
                }
                else {
                    this.localReadinessMap.set(i.playerID, i.readiness);
                }
            })
        })
    }

    //#region UI Mounting Methods
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
        this.logger.debug(`Updating main UI with mode: ${mode}`, props);
        const localPlayerID = Players.LocalPlayer.UserId;
        const localEntity = props.state?.getEntity(localPlayerID);

        // Create player portrait with HP bar (replaces previous HP bar)
        const playerPortrait = localEntity ?
            <PlayerPortrait
                entityId={localEntity.stats.id}
                hp={localEntity.getState('hip')}
                maxHP={calculateRealityValue(Reality.HP, localEntity.stats)}
            /> : undefined;

        const { readinessIcons, state, EHCGMS, accessToken } = props;
        if (props.readinessIcons) {
            props.readinessIcons.forEach((icon) => {
                this.localReadinessMap.set(icon.playerID, icon.readiness);
            });
        }

        switch (mode) {
            case 'onlyReadinessBar':
                assert(readinessIcons, `No readiness icons provided for mode: ${mode}`);
                GuiMothership.mount(
                    GuiTag.MainGui,
                    <MenuFrameElement transparency={1} key={`BattleUI`}>
                        <ReadinessBar icons={readinessIcons} />
                        {playerPortrait}
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
                        {playerPortrait}
                        {this.createSensitiveCellElements({ state, EHCGMS, readinessIcons, accessToken })}
                    </MenuFrameElement>);
                break;
        }
    }
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
        const elements = cellsToGlow.mapFiltered((cell) => <CellGlowingSurface cell={cell} />);
        GuiMothership.mount(GuiTag.Glow, <frame key={'GlowingPath'}>{elements}</frame>)
        return cellsToGlow;
    }

    mountOtherPlayersTurnGui() {
        GuiMothership.mount(GuiTag.OtherTurn, <OPTElement />);
    }

    mountAbilitySlots(cre: Entity) {
        const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
        if (!mountingAbilitySet) {
            this.logger.warn("No ability set found for entity");
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
                    // this.logger.debug("Cell:", c);
                    return <CellSurface
                        cell={t.cellGraphics}
                        onEnter={() => this.handleCellEnter(props, t)}
                        onclick={() => this.handleCellClick(props, t)}
                    />
                })}
        </frame>;
    }

    private async handleCellEnter({ state, EHCGMS }: UpdateMainUIConfig, tuple: EntityCellGraphicsTuple) {
        const creID = await this.network.requestCurrentActor(); assert(creID, "[handleCellEnter] Current CRE ID is not defined");
        const creQR = state.getEntity(creID)?.qr; assert(creQR, "[handleCellEnter] Current QR is not defined");
        const currentCell = state.getCell(creQR); assert(currentCell, "[handleCellEnter] Current cell is not defined");
        const oe = state.getEntity(tuple.cellGraphics.qr);
        const oeG = tuple.entityGraphics
        const cre = state.getEntity(creID); assert(cre, `[handleCellEnter] Entity is not defined @${creID}`);
        const creG = EHCGMS.findTupleByEntity(cre)?.entityGraphics; if (!creG) { this.logger.warn(`EntityGraphics not found for entity @${creID}`); return; }

        // 0. Change mouse icon if the cell is not vacant
        const mouse = Players.LocalPlayer.GetMouse();
        if (cre.armed && oe?.qr && oeG) {
            creG.faceEntity(oeG);
            const ability = cre.getEquippedAbilitySet()[cre.armed];
            const glowHexCells = [] as HexCellGraphics[];
            if (ability) {
                if (state.getCell(oe.qr)?.isWithinRangeOf(currentCell, ability.range)) {
                    mouse.Icon = DECAL_WITHINRANGE;
                }
                else {
                    mouse.Icon = DECAL_OUTOFRANGE;
                }
                const inrange = currentCell.findCellsWithinRange(ability.range);
                inrange
                    .mapFiltered((cell: HexCell) => EHCGMS.positionTuple(cell.qr()))
                    .forEach((t: EntityCellGraphicsTuple) => glowHexCells.push(t.cellGraphics))
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
                grid: state.getGridState(),
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
        this.logger.debug("Cell clicked", clickedtuple);
        if (clickedtuple.entityGraphics) {
            this.logger.debug("State", props.state);
            const clickedOnEntity = props.state.getEntity(clickedtuple.cellGraphics.qr);
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
    private async clickedOnEntity(props: UpdateMainUIConfig, clickedOn: Entity, accessToken: AccessToken) {
        this.logger.debug("Clicked on entity", clickedOn);
        const cre = await this.getCurrentActor();
        const iability = await this.getCurrentActorEquippedAbility();

        const commitedAction = {
            type: ActionType.Attack,
            ability: {
                ...iability,
                using: cre,
                target: clickedOn.state(),
            },
            by: cre.playerID,
            against: clickedOn.playerID,
            executed: false,
        };
        accessToken.action = commitedAction
        remotes.battle.act(accessToken);
    }

    private async clickedOnEmptyCell(props: UpdateMainUIConfig, emptyTuple: EntityCellGraphicsTuple, accessToken: AccessToken) {
        this.logger.debug("Clicked on empty cell", emptyTuple);
        const start = await this.getCurrentActorQR();
        const dest = emptyTuple.cellGraphics.qr;
        await this.commiteMoveAction(props, accessToken, start, dest);
    }
    //#endregion

    //#region Communicate with the server
    private async getCurrentActorID() {
        const res = await this.network.requestCurrentActor();
        assert(res, "Invalid response from server for current actor ID");
        return res;
    }

    private async getCurrentGameState() {
        const gs = await this.network.requestGameState()
        assert(gs, "Invalid response from server for game state");
        return gs;
    }

    private async getCurrentActor() {
        const creID = await this.getCurrentActorID();
        const gs = await this.getCurrentGameState();
        let cre: EntityState | undefined = undefined;
        gs.teams.find(t => {
            return !!t.members.find(m => m.playerID === creID ? !!(cre = m) : false);
        });
        assert(cre, "Current actor is not found from id: " + creID);
        return cre as EntityState;
    }

    private async getCurrentActorQR() {
        const cre = await this.getCurrentActor();
        const qr = cre.qr;
        return qr;
    }

    private async getCurrentActorEquippedAbility() {
        const cre = await this.getCurrentActor();
        const iability = UNIVERSAL_PHYS.get('4-Slash-Combo')!; // temp: change this later to get actual equipped ability
        assert(iability, "Invalid ability");
        return iability;
    }


    private async commiteMoveAction(mainUIConfig: UpdateMainUIConfig, ac: AccessToken, start: Vector2, dest: Vector2) {
        this.updateMainUI('onlyReadinessBar', mainUIConfig);
        const readinessIcon = this.localReadinessMap.get(ac.userId);
        const action = {
            type: ActionType.Move,
            executed: false,
            by: ac.userId,
            to: dest,
            from: start,
        } as MoveAction;
        if (readinessIcon) {
            const distance = mainUIConfig.state.getDistance(start, dest);
            this.logger.debug(`localreadinessIcon: ${readinessIcon()} => ${readinessIcon() - distance * MOVEMENT_COST}`);
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
        this.logger.debug("Committing action", ac);
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
