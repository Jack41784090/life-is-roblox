import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import SquadContainer from "./SquadContainer";
import TeamHeader from "./TeamHeader";

interface TeamContainerProps {
    teamName: string;
    squads: Squad[];
    teamColor: Color3;
    teamIndex: number;
}

function TeamContainer(props: TeamContainerProps) {
    return (
        <frame
            key={props.teamName}
            Size={new UDim2(.8, 0, .5, 0)}
            BackgroundColor3={props.teamColor}
            BackgroundTransparency={0.8}
            BorderColor3={props.teamColor}
            BorderSizePixel={2}
            LayoutOrder={props.teamIndex}
        >
            <TeamHeader
                teamName={props.teamName}
                squadCount={props.squads.size()}
            />

            <SquadContainer
                squads={props.squads}
                teamName={props.teamName}
            />
        </frame>
    );
}

export = TeamContainer;