import React, { useEffect, useState } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { AbilitySet } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import AbilitySlots from "../ability_slots";
import FightingStyleSlot from "./fighting_style_slot";

interface AbilityControlPanelProps {
    cre: Entity;
    abilitySet: AbilitySet;
    onStyleSelect?: (styleIndex: number) => void;
}

interface FightingStyleSlotsProps {
    entity: Entity;
    onStyleSelect?: (styleIndex: number) => void;
    LayoutOrder?: number;
}

function FightingStyleSlots({ entity, onStyleSelect, LayoutOrder = 0 }: FightingStyleSlotsProps) {
    const [styles, setStyles] = useState<FightingStyleState[]>([]);
    const [activeStyleIndex, setActiveStyleIndex] = useState<number>(0);

    useEffect(() => {
        const entityState = entity.state();
        setStyles(entityState.fightingStyles);
        setActiveStyleIndex(entityState.activeStyleIndex);
    }, [entity]);

    const handleStyleSelect = (styleIndex: number) => {
        if (entity.switchFightingStyle(styleIndex)) {
            setActiveStyleIndex(styleIndex);
            onStyleSelect?.(styleIndex);
        }
    };

    return (
        <frame
            Size={UDim2.fromScale(1, 0.5)}
            BackgroundTransparency={1}
            LayoutOrder={LayoutOrder}
        >
            <uilistlayout
                FillDirection={'Horizontal'}
                SortOrder={'LayoutOrder'}
                HorizontalAlignment={'Center'}
                VerticalAlignment={'Center'}
                HorizontalFlex={'SpaceAround'}
            />
            <uipadding PaddingTop={new UDim(0, 5)} />

            {styles.map((style, index) => (
                <FightingStyleSlot
                    key={`style-${index}`}
                    style={style}
                    index={index}
                    isActive={index === activeStyleIndex}
                    entity={entity}
                    onSelect={handleStyleSelect}
                />
            ))}
        </frame>
    );
}

export function AbilityControlPanel({ cre, abilitySet, onStyleSelect }: AbilityControlPanelProps) {
    return (
        <imagelabel
            key={"AbilityControlPanel"}
            AnchorPoint={new Vector2(1, 1)}
            Size={UDim2.fromScale(0.3, 0)}
            Position={UDim2.fromScale(1, 1)}
            BackgroundTransparency={1}
        >
            <uiaspectratioconstraint
                AspectRatio={4.25}
                AspectType={"ScaleWithParentSize"}
                DominantAxis={'Width'}
            />
            <uilistlayout
                FillDirection={'Vertical'}
                SortOrder={'LayoutOrder'}
                HorizontalAlignment={'Center'}
                VerticalAlignment={'Bottom'}
                Padding={new UDim(0, 10)}
            />

            <FightingStyleSlots
                entity={cre}
                onStyleSelect={onStyleSelect}
                LayoutOrder={0}
            />

            <frame
                Size={UDim2.fromScale(1, 0.5)}
                BackgroundTransparency={1}
                LayoutOrder={1}
            >
                <uilistlayout
                    FillDirection={'Horizontal'}
                    SortOrder={'LayoutOrder'}
                    HorizontalAlignment={'Center'}
                    VerticalAlignment={'Center'}
                    HorizontalFlex={'SpaceAround'}
                />
                <uipadding PaddingBottom={new UDim(0, 5)} />
                <AbilitySlots cre={cre} abilitySet={abilitySet} />
            </frame>
        </imagelabel>
    );
}

export default AbilityControlPanel;
