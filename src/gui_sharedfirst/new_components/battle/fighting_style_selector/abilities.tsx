import React from "@rbxts/react";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";

interface StyleAbilitiesProps {
    style: FightingStyleState;
}

function StyleAbilities({ style }: StyleAbilitiesProps) {
    return (
        <frame
            Size={new UDim2(1, 0, 0, 60)}
            BackgroundTransparency={1}
            LayoutOrder={3}
        >
            <uipadding
                PaddingLeft={new UDim(0, 5)}
                PaddingRight={new UDim(0, 5)}
            />
            <uilistlayout
                SortOrder={Enum.SortOrder.LayoutOrder}
                Padding={new UDim(0, 5)}
            />
            <textlabel
                Size={new UDim2(1, 0, 0, 20)}
                BackgroundTransparency={1}
                TextColor3={new Color3(0.9, 0.9, 0.9)}
                Font={Enum.Font.GothamBold}
                TextSize={14}
                TextXAlignment={Enum.TextXAlignment.Left}
                Text="Abilities:"
                LayoutOrder={0}
            />
            <frame
                Size={new UDim2(1, 0, 0, 30)}
                BackgroundTransparency={1}
                LayoutOrder={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    HorizontalAlignment={Enum.HorizontalAlignment.Left}
                    Padding={new UDim(0, 10)}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                />
                {style.availableAbilities.map((ability, i) => (
                    <AbilityIcon key={`ability-${i}`} ability={ability} index={i} />
                ))}
            </frame>
        </frame>
    );
}

interface AbilityIconProps {
    ability: string;
    index: number;
}

function AbilityIcon({ ability, index }: AbilityIconProps) {
    return (
        <frame
            Size={new UDim2(0, 30, 0, 30)}
            BackgroundColor3={new Color3(0.2, 0.6, 0.9)}
            BorderSizePixel={0}
            LayoutOrder={index}
        >
            <uicorner CornerRadius={new UDim(0, 5)} />
            <textlabel
                Size={new UDim2(1, 0, 1, 0)}
                BackgroundTransparency={1}
                TextColor3={new Color3(1, 1, 1)}
                Font={Enum.Font.GothamBold}
                TextSize={14}
                Text={ability.sub(0, 1)}
            />
        </frame>
    );
}

export = StyleAbilities;
