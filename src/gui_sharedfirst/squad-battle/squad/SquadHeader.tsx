import React from "@rbxts/react";

interface SquadHeaderProps {
    name: string;
    team: string;
}

function SquadHeader(props: SquadHeaderProps) {
    return (
        <textlabel
            Size={new UDim2(1, 0, 0, 25)}
            Position={new UDim2(0, 0, 0, 0)}
            BackgroundTransparency={1}
            Text={`${props.name} (${props.team})`}
            TextColor3={new Color3(1, 1, 1)}
            TextScaled={true}
            Font={Enum.Font.GothamBold}
        />
    );
}

export = SquadHeader;