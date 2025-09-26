import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { EntityUpdate, SquadEntityInSquadLocation } from "squad-battle/type";
import PlayerPortrait from "../entity/EntityDisplay";
import { getLocationColor } from "../shared/utils";

interface LocationLineProps {
    title: string;
    entities: SquadEntity[];
    location: SquadEntityInSquadLocation;
    entityUpdates?: EntityUpdate[];
}

function LocationLine(props: LocationLineProps) {
    const lineColor = getLocationColor(props.location);

    return (
        <frame Size={UDim2.fromScale(1, 1 / 3)} BackgroundTransparency={1}>
            <textlabel
                Size={UDim2.fromScale(1, 0.1)}
                BackgroundTransparency={1}
                Text={props.title}
                TextColor3={lineColor}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

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