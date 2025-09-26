import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import LocationLine from "./LocationLine";

interface SquadDisplayProps {
    name: string;
    team: string;
    entities: SquadEntity[];
    teamSize: number;
    upsideDown?: boolean;
}

function SquadDisplay(props: SquadDisplayProps) {
    const getEntitiesByLocation = () => {
        const locations: Record<SquadEntityInSquadLocation, SquadEntity[]> = {
            [SquadEntityInSquadLocation.front]: [],
            [SquadEntityInSquadLocation.middle]: [],
            [SquadEntityInSquadLocation.back]: []
        };

        props.entities.forEach(entity => {
            const loc = entity.changeableStats.LOC() as SquadEntityInSquadLocation;
            if (locations[loc]) {
                locations[loc].push(entity);
            }
        });

        return locations;
    };

    const entitiesByLocation = getEntitiesByLocation();
    // const totalHeight = 300;
    // const squadWidth = 400;

    const headerYSize = .17;
    const bodyYSize = 1 - headerYSize;

    return (
        <frame
            // Position={props.position || new UDim2(0, 0, 0, 0)}
            Position={UDim2.fromScale(0, .5)}
            Size={UDim2.fromScale(math.min(0.6, 1 / props.teamSize * .8), 1)}
            BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={0.3}
            BorderColor3={new Color3(0.6, 0.6, 0.6)}
            BorderSizePixel={2}
        // SizeConstraint={'RelativeXX'}
        >
            {/* <uiaspectratioconstraint AspectRatio={1} /> */}
            {/* <textlabel
                Size={new UDim2(1, 0, headerYSize, 0)}
                // Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={`${props.name} (${props.team})`}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}

            /> */}

            <frame
                Size={UDim2.fromScale(1, 1)}
                // Position={UDim2.fromScale(0, headerYSize)}
                BackgroundTransparency={0.65}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    VerticalAlignment={Enum.VerticalAlignment.Top}
                />

                {props.upsideDown &&
                    <LocationLine
                        title="BACK LINE"
                        entities={entitiesByLocation[SquadEntityInSquadLocation.back]}
                        location={SquadEntityInSquadLocation.back}
                    />}

                {!props.upsideDown &&
                    <LocationLine
                        title="FRONT LINE"
                        entities={entitiesByLocation[SquadEntityInSquadLocation.front]}
                        location={SquadEntityInSquadLocation.front}
                    />
                }

                <LocationLine
                    title="MIDDLE LINE"
                    entities={entitiesByLocation[SquadEntityInSquadLocation.middle]}
                    location={SquadEntityInSquadLocation.middle}
                />

                {!props.upsideDown &&
                    <LocationLine
                        title="BACK LINE"
                        entities={entitiesByLocation[SquadEntityInSquadLocation.back]}
                        location={SquadEntityInSquadLocation.back}
                    />}

                {props.upsideDown &&
                    <LocationLine
                        title="FRONT LINE"
                        entities={entitiesByLocation[SquadEntityInSquadLocation.front]}
                        location={SquadEntityInSquadLocation.front}
                    />
                }

            </frame>
        </frame>
    );
}

export = SquadDisplay;