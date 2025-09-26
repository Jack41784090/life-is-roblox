import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import SquadContainer from "./SquadContainer";

interface TeamContainerProps {
    teamName: string;
    squads: Squad[];
    teamColor: Color3;
    teamIndex: number;
}

function TeamContainer(props: TeamContainerProps) {
    const headYSize = .1;
    const bodyYSize = 1 - headYSize;
    return (
        <frame
            key={props.teamName}
            Size={new UDim2(.9, 0, .5, 0)}
            BackgroundColor3={props.teamColor}
            BackgroundTransparency={0.8}
            BorderColor3={props.teamColor}
            BorderSizePixel={2}
            LayoutOrder={props.teamIndex}
        >
            {/* <TeamHeader
                Size={UDim2.fromScale(1, headYSize)}
                teamName={props.teamName}
                squadCount={props.squads.size()}
            /> */}

            <SquadContainer
                Size={UDim2.fromScale(1, 1)}
                squads={props.squads}
                teamName={props.teamName}
            />
        </frame>
    );
}

export = TeamContainer;