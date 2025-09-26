import React from "@rbxts/react";

interface BattleHeaderProps {
    currentRound?: number;
}

function BattleHeader(props: BattleHeaderProps) {
    return (
        <textlabel
            Size={new UDim2(1, 0, 0, 40)}
            Position={new UDim2(0, 0, 0, 0)}
            BackgroundTransparency={1}
            Text={`Squad Battle${props.currentRound ? ` - Round ${props.currentRound}` : ""}`}
            TextColor3={new Color3(1, 1, 1)}
            TextScaled={true}
            Font={Enum.Font.GothamBold}
        />
    );
}

export = BattleHeader;