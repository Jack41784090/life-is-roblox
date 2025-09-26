import React from "@rbxts/react";

interface BattleHeaderProps {
    Size?: UDim2;
    currentRound?: number;
}

function BattleHeader(props: BattleHeaderProps) {
    return (
        <textlabel
            Size={props.Size || new UDim2(1, 0, .2, 0)}
            Position={new UDim2(0, 0, 0, 0)}
            BackgroundTransparency={0}
            Text={`Squad Battle${props.currentRound ? ` - Round ${props.currentRound}` : ""}`}
            TextColor3={new Color3(1, 1, 1)}
            TextScaled={true}
            Font={Enum.Font.GothamBold}
        />
    );
}

export = BattleHeader;