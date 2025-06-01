import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { OPTElement } from "gui_sharedfirst";
import AbilityControlPanel from "gui_sharedfirst/new_components/battle/ability_control_panel";
import CellGlowingSurface from "gui_sharedfirst/new_components/battle/cell/glow";
import MainFrame from "gui_sharedfirst/new_components/battle/main-frame";
import PlayerPortrait from "gui_sharedfirst/new_components/battle/statusBar/playerPortrait";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { GuiTag } from "shared/const";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import Entity from "../../State/Entity";
import HexCellGraphics from "../../State/Hex/Cell/Graphics";
import { Reality } from "../../Systems/CombatSystem/types";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";
import { GuiConfig } from "./types";

export default class BattleGui {
    private logger = Logger.createContextLogger("BattleGUI");
    private readinessFragments: Atom<Atom<ReadinessFragment>[]>;

    static Connect(config: GuiConfig) {
        const ui = new BattleGui(config);
        return ui
    }

    private constructor(config: GuiConfig) {
        this.readinessFragments = config.readinessFragments;
        this.updateUI();
    }

    //#region UI Mounting Methods
    public forceUpdateMainFrame(localEntity?: Entity, sensitiveCells?: React.Element) {
        this.logger.info("Forcing update of the main frame UI", {
            localEntity,
            sensitiveCells,
        });
        this.updateUI(localEntity, sensitiveCells);
    }

    private _cachedEntity?: Entity;
    private updateUI(localEntity?: Entity, sensitiveCells?: React.Element) {
        // Cache the entity for consistency
        if (localEntity) {
            this._cachedEntity = localEntity;
        }
        const entity = localEntity ?? this._cachedEntity;

        // Always create all components in the unified UI
        const playerPortrait = entity ? (
            <PlayerPortrait
                entityId={entity.stats.id}
                hp={entity.getState('hip')}
                maxHP={calculateRealityValue(Reality.HP, entity.stats)}
            />
        ) : undefined;

        const unifiedControlPanel = entity ? (
            <AbilityControlPanel
                cre={entity}
                abilitySet={entity.getAllAbilitySets()[0] ?? undefined}
                onStyleSelect={(styleIndex) => {
                    this.updateUI(entity);
                }}
            />
        ) : undefined;

        // Mount the unified UI - all components are displayed simultaneously
        GuiMothership.Mount(GuiTag.MainGui,
            <MainFrame
                key={`UnifiedBattleUI-${tick()}`}
                icons={this.readinessFragments}
                portrait={playerPortrait}
                cells={sensitiveCells}
                controlPanel={unifiedControlPanel}
            />
        )
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
