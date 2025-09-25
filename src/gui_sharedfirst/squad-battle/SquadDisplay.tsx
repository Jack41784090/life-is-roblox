import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import EntityDisplay from "./EntityDisplay";

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
            <textlabel
                Size={new UDim2(1, 0, 0, 25)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={`${props.name} (${props.team})`}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <frame
                Size={new UDim2(1, 0, 1, -25)}
                Position={new UDim2(0, 0, 0, 25)}
                BackgroundTransparency={1}
            >
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    Position={new UDim2(0, 0, 0, 0)}
                    BackgroundTransparency={1}
                    Text="FRONT LINE"
                    TextColor3={new Color3(1, 0.5, 0.5)}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                <scrollingframe
                    Size={new UDim2(1, 0, 0, 60)}
                    Position={new UDim2(0, 0, 0, 20)}
                    BackgroundTransparency={1}
                    ScrollingDirection={Enum.ScrollingDirection.X}
                    CanvasSize={new UDim2(0, entitiesByLocation[SquadEntityInSquadLocation.front].size() * 130, 0, 0)}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Horizontal}
                        SortOrder={Enum.SortOrder.LayoutOrder}
                        Padding={new UDim(0, 10)}
                    />

                    {entitiesByLocation[SquadEntityInSquadLocation.front].map((entity, index) => (
                        <EntityDisplay
                            key={`front-${entity.playerID}`}
                            name={entity.name}
                            playerID={entity.playerID}
                            team={entity.team}
                            baseStats={entity.stats}
                            changeableStats={entity.changeableStats}
                        />
                    ))}
                </scrollingframe>

                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    Position={new UDim2(0, 0, 0, 85)}
                    BackgroundTransparency={1}
                    Text="MIDDLE LINE"
                    TextColor3={new Color3(1, 1, 0.5)}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                <scrollingframe
                    Size={new UDim2(1, 0, 0, 60)}
                    Position={new UDim2(0, 0, 0, 105)}
                    BackgroundTransparency={1}
                    ScrollingDirection={Enum.ScrollingDirection.X}
                    CanvasSize={new UDim2(0, entitiesByLocation[SquadEntityInSquadLocation.middle].size() * 130, 0, 0)}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Horizontal}
                        SortOrder={Enum.SortOrder.LayoutOrder}
                        Padding={new UDim(0, 10)}
                    />

                    {entitiesByLocation[SquadEntityInSquadLocation.middle].map((entity, index) => (
                        <EntityDisplay
                            key={`middle-${entity.playerID}`}
                            name={entity.name}
                            playerID={entity.playerID}
                            team={entity.team}
                            baseStats={entity.stats}
                            changeableStats={entity.changeableStats}
                        />
                    ))}
                </scrollingframe>

                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    Position={new UDim2(0, 0, 0, 170)}
                    BackgroundTransparency={1}
                    Text="BACK LINE"
                    TextColor3={new Color3(0.5, 0.5, 1)}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                <scrollingframe
                    Size={new UDim2(1, 0, 0, 60)}
                    Position={new UDim2(0, 0, 0, 190)}
                    BackgroundTransparency={1}
                    ScrollingDirection={Enum.ScrollingDirection.X}
                    CanvasSize={new UDim2(0, entitiesByLocation[SquadEntityInSquadLocation.back].size() * 130, 0, 0)}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Horizontal}
                        SortOrder={Enum.SortOrder.LayoutOrder}
                        Padding={new UDim(0, 10)}
                    />

                    {entitiesByLocation[SquadEntityInSquadLocation.back].map((entity, index) => (
                        <EntityDisplay
                            key={`back-${entity.playerID}`}
                            name={entity.name}
                            playerID={entity.playerID}
                            team={entity.team}
                            baseStats={entity.stats}
                            changeableStats={entity.changeableStats}
                        />
                    ))}
                </scrollingframe>
            </frame>
        </frame>
    );
}

export = SquadDisplay;