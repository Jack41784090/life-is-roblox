import React from "@rbxts/react";
import { EntityBaseStats, EntityChangeableStats } from "squad-battle/type";
import { getTeamColor } from "../shared/utils";
import EntityInfo from "./EntityInfo";
import EntityStats from "./EntityStats";

interface EntityDisplayProps {
    name: string;
    playerID: number;
    team: string;
    baseStats: EntityBaseStats;
    changeableStats: EntityChangeableStats;
    position?: UDim2;
}

function EntityDisplay(props: EntityDisplayProps) {
    return (
        <frame
            Position={props.position || new UDim2(0, 0, 0, 0)}
            Size={new UDim2(.25, 0, 1, 0)}
            BackgroundColor3={getTeamColor(props.team)}
            BackgroundTransparency={0.1}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={1}
        >
            <uicorner CornerRadius={new UDim(1)} />

            <EntityInfo
                name={props.name}
                playerID={props.playerID}
                changeableStats={props.changeableStats}
            />

            <EntityStats changeableStats={props.changeableStats} />
        </frame>
    );
}

export = EntityDisplay;