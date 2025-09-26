import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import SquadDisplay from "../squad/SquadDisplay";

interface SquadContainerProps {
    squads: Squad[];
    teamName: string;
    Size?: UDim2;
}

function SquadContainer(props: SquadContainerProps) {
    return (
        <frame
            Size={props.Size || new UDim2(1, 0, 1, 0)}
            Position={UDim2.fromScale(0, 1)}
            AnchorPoint={new Vector2(0, 1)}
            BackgroundTransparency={.8}
        >
            <uilistlayout
                FillDirection={Enum.FillDirection.Horizontal}
                SortOrder={Enum.SortOrder.LayoutOrder}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                VerticalAlignment={Enum.VerticalAlignment.Center}
                // ItemLineAlignment={Enum.ItemLineAlignment.Center}
                Padding={new UDim(0, 10)}
            />

            {props.squads.map((squad, squadIndex) => (
                <SquadDisplay
                    name={squad.name}
                    team={squad.team}
                    entities={squad.entities}
                    teamSize={props.squads.size()}
                // position={new UDim2(0, 0, 0, 0)}
                />
            ))}
        </frame>
    );
}

export = SquadContainer;