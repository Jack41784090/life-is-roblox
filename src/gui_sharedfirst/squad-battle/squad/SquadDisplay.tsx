import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import { EntityUpdateIndicator } from "../entity/types";
import LocationLine from "./LocationLine";

interface SquadDisplayProps {
    name: string;
    team: string;
    entities: SquadEntity[];
    teamSize: number;
    upsideDown?: boolean;
    entityUpdates?: EntityUpdateIndicator[];
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

    const topsection = (<>
        {props.upsideDown &&
            <LocationLine
                title="BACK LINE"
                entities={entitiesByLocation[SquadEntityInSquadLocation.back]}
                location={SquadEntityInSquadLocation.back}
                entityUpdates={props.entityUpdates}
            />}

        {!props.upsideDown &&
            <LocationLine
                title="FRONT LINE"
                entities={entitiesByLocation[SquadEntityInSquadLocation.front]}
                location={SquadEntityInSquadLocation.front}
                entityUpdates={props.entityUpdates}
            />
        }
    </>)

    const bottomSection = (<>
        {!props.upsideDown &&
            <LocationLine
                title="BACK LINE"
                entities={entitiesByLocation[SquadEntityInSquadLocation.back]}
                location={SquadEntityInSquadLocation.back}
                entityUpdates={props.entityUpdates}
            />}

        {props.upsideDown &&
            <LocationLine
                title="FRONT LINE"
                entities={entitiesByLocation[SquadEntityInSquadLocation.front]}
                location={SquadEntityInSquadLocation.front}
                entityUpdates={props.entityUpdates}
            />
        }
    </>);

    return (
        <frame
            // Position={props.position || new UDim2(0, 0, 0, 0)}
            Position={UDim2.fromScale(0, .5)}
            Size={UDim2.fromScale(math.min(0.6, 1 / props.teamSize * .8), 1)}
            // BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={.90}
            BorderColor3={new Color3(0.6, 0.6, 0.6)}
            BorderSizePixel={1}
        >
            <uilistlayout
                FillDirection={Enum.FillDirection.Vertical}
                SortOrder={Enum.SortOrder.LayoutOrder}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                VerticalAlignment={Enum.VerticalAlignment.Top}
            />
            {topsection}
            <LocationLine
                title="MIDDLE LINE"
                entities={entitiesByLocation[SquadEntityInSquadLocation.middle]}
                location={SquadEntityInSquadLocation.middle}
                entityUpdates={props.entityUpdates}
            />
            {bottomSection}
        </frame>
    );
}

export = SquadDisplay;