import React from "@rbxts/react";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";

interface PassiveEffectsProps {
    style: FightingStyleState;
}

function PassiveEffects({ style }: PassiveEffectsProps) {
    return (
        <frame
            Size={new UDim2(1, 0, 0, 60)}
            BackgroundTransparency={1}
            LayoutOrder={2}
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
                Text="Passive Effects:"
                LayoutOrder={0}
            />
            {style.passiveEffects.map((effect, i) => (
                <textlabel
                    key={`effect-${i}`}
                    Size={new UDim2(1, 0, 0, 16)}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(0.8, 0.8, 1)}
                    Font={Enum.Font.Gotham}
                    TextSize={12}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    Text={`• ${effect.description}`}
                    LayoutOrder={i + 1}
                />
            ))}
        </frame>
    );
}

export = PassiveEffects;
