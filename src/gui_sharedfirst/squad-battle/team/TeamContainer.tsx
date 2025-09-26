import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import { EntityUpdate } from "squad-battle/type";
import SquadContainer from "./SquadContainer";

interface TeamContainerProps {
    teamName: string;
    squads: Squad[];
    upsideDown?: boolean;
    entityUpdates?: EntityUpdate[];
}

function TeamContainer(props: TeamContainerProps) {
    return (
        <frame
            key={props.teamName}
            Size={new UDim2(.9, 0, .5, 0)}
            BackgroundTransparency={0.8}
            BorderSizePixel={2}
        >
            <SquadContainer
                Size={UDim2.fromScale(1, 1)}
                squads={props.squads}
                teamName={props.teamName}
                upsideDown={props.upsideDown}
                entityUpdates={props.entityUpdates}
            />
        </frame>
    );
}

export = TeamContainer;