import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import SquadDisplay from "../squad/SquadDisplay";

interface SquadContainerProps {
    squads: Squad[];
    teamName: string;
}

function SquadContainer(props: SquadContainerProps) {
    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            Position={new UDim2(0, 0, .5, 0)}
            AnchorPoint={new Vector2(0, .5)}
            BackgroundTransparency={1}
        >
            <uilistlayout
                FillDirection={Enum.FillDirection.Horizontal}
                SortOrder={Enum.SortOrder.LayoutOrder}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
            />

            {props.squads.map((squad, squadIndex) => (
                <frame
                    key={`${props.teamName}-${squad.name}`}
                    Size={new UDim2(1, 0, 1, 0)}
                    BackgroundTransparency={1}
                    LayoutOrder={squadIndex}
                >
                    <SquadDisplay
                        name={squad.name}
                        team={squad.team}
                        entities={squad.entities}
                        position={new UDim2(0, 0, 0, 0)}
                    />
                </frame>
            ))}
        </frame>
    );
}

export = SquadContainer;