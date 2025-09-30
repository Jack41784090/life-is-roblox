import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import PlayerPortrait from "../entity/EntityDisplay";
import { EntityUpdateIndicator } from "../entity/types";
import { getLocationColor } from "../shared/utils";

interface LocationLineProps {
    title: string;
    entities: SquadEntity[];
    location: SquadEntityInSquadLocation;
    entityUpdates?: EntityUpdateIndicator[];
}

function LocationLine(props: LocationLineProps) {
    const lineColor = getLocationColor(props.location);

    return (
        <frame Size={UDim2.fromScale(1, 1 / 3)} BackgroundTransparency={1}>
            <frame
                Position={UDim2.fromScale(0, 0.1)}
                Size={UDim2.fromScale(1, 0.9)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    // Padding={new UDim(0, 10)}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    VerticalAlignment={Enum.VerticalAlignment.Center}
                />

                {props.entities.map((entity) => {
                    // Filter updates relevant to this entity
                    const relevantUpdates = props.entityUpdates?.filter(update =>
                        update.affected === entity.playerID
                    ) || [];

                    return (
                        <PlayerPortrait
                            key={`${props.location}-${entity.playerID}`}
                            entity={entity}
                            entityUpdates={relevantUpdates}
                        />
                    );
                })}
            </frame>
        </frame>
    );
}

export = LocationLine;