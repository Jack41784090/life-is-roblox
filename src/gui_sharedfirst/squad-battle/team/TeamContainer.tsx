import React from "@rbxts/react";
import SquadDisplay from "../squad/SquadDisplay";
import { SquadContainerProps } from "../type";

export default function TeamContainer(props: SquadContainerProps) {
    return (
        <frame
            Size={props.Size || UDim2.fromScale(.9, .5)}
            Position={UDim2.fromScale(0, 1)}
            AnchorPoint={new Vector2(0, 1)}
            BackgroundTransparency={1}
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
                    upsideDown={props.upsideDown}
                    entityUpdates={props.entityUpdates}
                    syncAfterSecond={props.syncAfterSecond}
                />
            ))}
        </frame>
    );
}

// export = SquadContainer;