import { atom, Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { AbilitySetElement, AbilitySlotsElement, ButtonElement, ButtonFrameElement, MenuFrameElement, OPTElement } from "gui_sharedfirst";
import FightingStyleSelector from "gui_sharedfirst/components/fighting-style-selector";
import CellGlowingSurface from "gui_sharedfirst/new_components/battle/cell/glow";
import MainFrame from "gui_sharedfirst/new_components/battle/main-frame";
import PlayerPortrait from "gui_sharedfirst/new_components/battle/statusBar/playerPortrait";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { CharacterMenuAction, MainUIModes, Reality } from "shared/class/battle/types";
import { GuiTag } from "shared/const";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import Entity from "../../State/Entity";
import HexCellGraphics from "../../State/Hex/Cell/Graphics";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";
import { GuiConfig, GuiModes } from "./types";

export default class BattleGui {
    getMode() {
        return this.mode();
    }
    private mode: Atom<GuiModes>;
    private logger = Logger.createContextLogger("BattleGUI");
    private readinessFragments: Atom<Atom<ReadinessFragment>[]>;

    static Connect(config: GuiConfig) {
        const ui = new BattleGui(config);
        return ui
    }

    private constructor(config: GuiConfig) {
        this.mode = atom<GuiModes>('onlyReadinessBar');
        this.readinessFragments = config.readinessFragments;
        this.forceUpdateMainFrame('onlyReadinessBar');
    } public setMode(mode: GuiModes) {
        // this.logger.debug(`Setting mode to ${mode}`);
        this.mode(mode);
        this.updateUI();
    }

    //#region UI Mounting Methods
    public forceUpdateMainFrame(mode: MainUIModes, localEntity?: Entity, sensitiveCells?: React.Element) {
        // this.logger.debug(`Force updating main UI with mode: ${mode}`);
        this.mode(mode);
        this.updateUI(localEntity, sensitiveCells);
    }

    private updateUI(localEntity?: Entity, sensitiveCells?: React.Element) {
        const playerPortrait = localEntity ?
            <PlayerPortrait
                entityId={localEntity.stats.id}
                hp={localEntity.getState('hip')}
                maxHP={calculateRealityValue(Reality.HP, localEntity.stats)}
            /> : undefined;

        GuiMothership.Mount(GuiTag.MainGui,
            <MainFrame
                key={`BattleUI-${tick()}`}
                mode={this.mode}
                icons={this.readinessFragments}
                portrait={playerPortrait}
                cells={sensitiveCells}
            />
        )
    }
    /**
     * Mounts action menu
     * Action Menu: a menu that shows the available actions for the entity's turn (e.g. go into move mode, items, end turn)
     * 
     * @param actions 
     * @returns 
     */
    public mountActionMenu(actions: CharacterMenuAction[]) {
        GuiMothership.Mount(
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
    // Highlight the cells along a path
    public mountOrUpdateGlow(cellsToGlow: HexCellGraphics[]): HexCellGraphics[] | undefined {
        const elements = cellsToGlow.mapFiltered((cell) => <CellGlowingSurface cell={cell} />);
        GuiMothership.Mount(GuiTag.Glow, <frame key={'GlowingPath'}>{elements}</frame>)
        return cellsToGlow;
    }

    public mountOtherPlayersTurnGui() {
        GuiMothership.Mount(GuiTag.OtherTurn, <OPTElement />);
    }

    public mountAbilitySlots(cre: Entity) {
        const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
        if (!mountingAbilitySet) {
            this.logger.warn("No ability set found for entity");
            return;
        }
        GuiMothership.Mount(GuiTag.AbilitySlot,
            <AbilitySetElement>
                <AbilitySlotsElement cre={cre} gui={this} abilitySet={mountingAbilitySet} />
            </AbilitySetElement>);
    }

    public mountFightingStyleSelector(entity: Entity) {
        // this.logger.debug(`Mounting fighting style selector for ${entity.name}`);
        GuiMothership.Mount(
            GuiTag.FightingStyleSelector,
            <FightingStyleSelector
                entity={entity}
                onStyleSelect={(styleIndex) => {
                    // When style changes, update ability slots if they're currently showing
                    if (this.mode() === 'withSensitiveCells') {
                        this.mountAbilitySlots(entity);
                    }
                }}
            />
        );
    }

    public unmountAndClear(tag: GuiTag) {
        GuiMothership.Unmount(tag);
    }
    //#endregion


    //#region Clearing Methods

    public clearAll() {
        this.clearAllLooseGui();
        this.clearAllLooseScript();
    }

    public clearAllLooseGui() {
        for (const [x, tag] of pairs(GuiTag)) {
            GuiMothership.Unmount(tag);
        }
    }

    public clearAllLooseScript() {
    }
    //#endregion
}
