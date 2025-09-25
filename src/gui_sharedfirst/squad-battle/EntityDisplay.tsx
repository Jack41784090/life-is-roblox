import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { EntityBaseStats, EntityChangeableStats, SquadEntityInSquadLocation } from "squad-battle/type";

interface EntityDisplayProps {
    name: string;
    playerID: number;
    team: string;
    baseStats: EntityBaseStats;
    changeableStats: EntityChangeableStats;
    position?: UDim2;
}

function EntityDisplay(props: EntityDisplayProps) {
    const hp = useAtom(props.changeableStats.HP);
    const sta = useAtom(props.changeableStats.STA);
    const loc = useAtom(props.changeableStats.LOC);

    const getLocationText = (location: SquadEntityInSquadLocation): string => {
        switch (location) {
            case SquadEntityInSquadLocation.front: return "FRONT";
            case SquadEntityInSquadLocation.middle: return "MID";
            case SquadEntityInSquadLocation.back: return "BACK";
            default: return "UNKNOWN";
        }
    };

    const getTeamColor = (teamName: string): Color3 => {
        return teamName === "player" ? new Color3(0.2, 0.6, 1) : new Color3(1, 0.3, 0.3);
    };

    return (
        <frame
            Position={props.position || new UDim2(0, 0, 0, 0)}
            Size={new UDim2(0, 120, 0, 80)}
            BackgroundColor3={getTeamColor(props.team)}
            BackgroundTransparency={0.1}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={1}
        >
            <textlabel
                Size={new UDim2(1, 0, 0.25, 0)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={props.name}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.2, 0)}
                Position={new UDim2(0, 0, 0.25, 0)}
                BackgroundTransparency={1}
                Text={`HP: ${hp}`}
                TextColor3={new Color3(0.9, 0.9, 0.9)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.2, 0)}
                Position={new UDim2(0, 0, 0.45, 0)}
                BackgroundTransparency={1}
                Text={`STA: ${sta}`}
                TextColor3={new Color3(0.9, 0.9, 0.9)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.15, 0)}
                Position={new UDim2(0, 0, 0.65, 0)}
                BackgroundTransparency={1}
                Text={getLocationText(loc)}
                TextColor3={new Color3(1, 1, 0.5)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.15, 0)}
                Position={new UDim2(0, 0, 0.8, 0)}
                BackgroundTransparency={1}
                Text={`ID: ${props.playerID}`}
                TextColor3={new Color3(0.7, 0.7, 0.7)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />
        </frame>
    );
}

export = EntityDisplay;