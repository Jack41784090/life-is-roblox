import React from "@rbxts/react";

interface TeamHeaderProps {
    teamName: string;
    squadCount: number;
}

function TeamHeader(props: TeamHeaderProps) {
    return (
        <textlabel
            Size={new UDim2(1, 0, 0, 30)}
            BackgroundTransparency={1}
            Text={`Team: ${props.teamName} (${props.squadCount} squads)`}
            TextColor3={new Color3(1, 1, 1)}
            TextScaled={true}
            Font={Enum.Font.GothamBold}
        />
    );
}

export = TeamHeader;