import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import LocationLine from "./LocationLine";
import SquadHeader from "./SquadHeader";

interface SquadDisplayProps {
    name: string;
    team: string;
    entities: SquadEntity[];
    position?: UDim2;
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
    const totalHeight = 300;
    const squadWidth = 400;

    return (
        <frame
            Position={props.position || new UDim2(0, 0, 0, 0)}
            Size={new UDim2(0, squadWidth, 0, totalHeight)}
            BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={0.3}
            BorderColor3={new Color3(0.6, 0.6, 0.6)}
            BorderSizePixel={2}
        >
            <SquadHeader name={props.name} team={props.team} />

            <frame
                Size={new UDim2(1, 0, 1, -25)}
                Position={new UDim2(0, 0, 0, 25)}
                BackgroundTransparency={1}
            >
                <LocationLine
                    title="FRONT LINE"
                    entities={entitiesByLocation[SquadEntityInSquadLocation.front]}
                    location={SquadEntityInSquadLocation.front}
                    yPosition={0}
                    isScrollable={false}
                />

                <LocationLine
                    title="MIDDLE LINE"
                    entities={entitiesByLocation[SquadEntityInSquadLocation.middle]}
                    location={SquadEntityInSquadLocation.middle}
                    yPosition={85}
                    isScrollable={true}
                />

                <LocationLine
                    title="BACK LINE"
                    entities={entitiesByLocation[SquadEntityInSquadLocation.back]}
                    location={SquadEntityInSquadLocation.back}
                    yPosition={170}
                    isScrollable={true}
                />
            </frame>
        </frame>
    );
}

export = SquadDisplay;