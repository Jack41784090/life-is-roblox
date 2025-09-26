import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import PlayerPortrait from "../entity/PlayerPortrait";
import { getLocationColor } from "../shared/utils";

interface LocationLineProps {
    title: string;
    entities: SquadEntity[];
    location: SquadEntityInSquadLocation;
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
                BackgroundTransparency={0}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    // Padding={new UDim(0, 10)}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    VerticalAlignment={Enum.VerticalAlignment.Center}
                />

                {props.entities.map((entity) => (
                    <PlayerPortrait
                        key={`${props.location}-${entity.playerID}`}
                        entityId={`entity_${entity.playerID}`}
                        hp={entity.changeableStats.HP}
                        maxHP={entity.changeableStats.HP()}
                    />
                ))}
            </frame>
        </frame>
    );
}

export = LocationLine;