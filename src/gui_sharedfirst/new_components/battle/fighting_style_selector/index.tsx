import React, { useEffect, useState } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import StyleAbilities from "./abilities";
import PassiveEffects from "./passive_effects";

interface FightingStyleSelectorProps {
    entity: Entity;
    onStyleSelect?: (styleIndex: number) => void;
}

function FightingStyleSelector({ entity, onStyleSelect }: FightingStyleSelectorProps) {
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
            Size={new UDim2(0, 250, 0, 300)}
            Position={new UDim2(0.01, 0, 0.2, 0)}
            BackgroundColor3={new Color3(0.1, 0.1, 0.12)}
            BorderSizePixel={0}
            ClipsDescendants={true}
        >
            <uicorner CornerRadius={new UDim(0, 8)} />
            <uistroke
                Color={new Color3(0.2, 0.6, 0.9)}
                Thickness={1}
            />
            <uipadding
                PaddingTop={new UDim(0, 10)}
                PaddingBottom={new UDim(0, 10)}
            />
            <uilistlayout
                SortOrder={Enum.SortOrder.LayoutOrder}
                Padding={new UDim(0, 10)}
            />
            <textlabel
                Size={new UDim2(1, 0, 0, 25)}
                BackgroundTransparency={1}
                TextColor3={new Color3(1, 1, 1)}
                Font={Enum.Font.GothamBold}
                TextSize={18}
                Text="Fighting Styles"
                LayoutOrder={0}
            />

            <scrollingframe
                Size={new UDim2(1, 0, 1, -35)}
                CanvasSize={new UDim2(0, 0, 0, styles.size() * 170)}
                BackgroundTransparency={1}
                ScrollBarThickness={4}
                BorderSizePixel={0}
                LayoutOrder={1}
            >
                <uilistlayout
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 10)}
                />
                {styles.map((style, index) => (
                    <StyleItem
                        key={`style-${index}`}
                        style={style}
                        index={index}
                        isActive={index === activeStyleIndex}
                        entity={entity}
                        onSelect={handleStyleSelect}
                    />
                ))}
            </scrollingframe>
        </frame>
    );
}

interface StyleItemProps {
    style: FightingStyleState;
    index: number;
    isActive: boolean;
    entity: Entity;
    onSelect: (index: number) => void;
}

function StyleItem({ style, index, isActive, entity, onSelect }: StyleItemProps) {
    return (
        <frame
            Size={new UDim2(1, -20, 0, 160)}
            Position={new UDim2(0.5, 0, 0, 0)}
            AnchorPoint={new Vector2(0.5, 0)}
            BackgroundColor3={isActive ? new Color3(0.2, 0.3, 0.4) : new Color3(0.15, 0.15, 0.18)}
            BorderSizePixel={0}
            LayoutOrder={index}
        >
            <uicorner CornerRadius={new UDim(0, 6)} />
            <uistroke
                Color={isActive ? new Color3(0.4, 0.8, 1) : new Color3(0.3, 0.3, 0.35)}
                Thickness={1}
            />
            <uilistlayout
                SortOrder={Enum.SortOrder.LayoutOrder}
                Padding={new UDim(0, 5)}
            />
            <frame
                Size={new UDim2(1, 0, 0, 35)}
                BackgroundTransparency={1}
                LayoutOrder={0}
            >
                <textlabel
                    Size={new UDim2(0.7, 0, 1, 0)}
                    Position={new UDim2(0, 10, 0, 0)}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(1, 1, 1)}
                    Font={Enum.Font.GothamBold}
                    TextSize={16}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    Text={style.name}
                />
                <textbutton
                    Size={new UDim2(0, 80, 0, 30)}
                    Position={new UDim2(1, -10, 0.5, 0)}
                    AnchorPoint={new Vector2(1, 0.5)}
                    BackgroundColor3={isActive ? new Color3(0.2, 0.6, 0.2) : new Color3(0.2, 0.4, 0.9)}
                    BorderSizePixel={0}
                    Font={Enum.Font.Gotham}
                    TextSize={14}
                    TextColor3={new Color3(1, 1, 1)}
                    Text={isActive ? "Active" : `Switch (${entity.getFightingStyles()[index].getSwitchCost()})`}
                    Event={{
                        MouseButton1Click: () => {
                            if (!isActive) {
                                onSelect(index);
                            }
                        },
                    }}
                    Active={!isActive}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                </textbutton>
            </frame>
            <textlabel
                Size={new UDim2(1, 0, 0, 30)}
                BackgroundTransparency={1}
                TextColor3={new Color3(0.8, 0.8, 0.8)}
                Font={Enum.Font.Gotham}
                TextSize={14}
                TextXAlignment={Enum.TextXAlignment.Left}
                TextYAlignment={Enum.TextYAlignment.Top}
                Text={style.description}
                TextWrapped={true}
                LayoutOrder={1}
                Position={new UDim2(0, 10, 0, 0)}
            />

            <PassiveEffects style={style} />
            <StyleAbilities style={style} />
        </frame>
    );
}

export = FightingStyleSelector;
