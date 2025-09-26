import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import EntityDisplay from "../entity/EntityDisplay";
import { getLocationColor } from "../shared/utils";

interface LocationLineProps {
    title: string;
    entities: SquadEntity[];
    location: SquadEntityInSquadLocation;
    yPosition: number;
    isScrollable?: boolean;
}

function LocationLine(props: LocationLineProps) {
    const lineColor = getLocationColor(props.location);

    if (props.isScrollable) {
        return (
            <>
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    Position={new UDim2(0, 0, 0, props.yPosition)}
                    BackgroundTransparency={1}
                    Text={props.title}
                    TextColor3={lineColor}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                <scrollingframe
                    Size={new UDim2(1, 0, 0, 60)}
                    Position={new UDim2(0, 0, 0, props.yPosition + 20)}
                    BackgroundTransparency={1}
                    ScrollingDirection={Enum.ScrollingDirection.X}
                    CanvasSize={new UDim2(0, props.entities.size() * 130, 0, 0)}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Horizontal}
                        SortOrder={Enum.SortOrder.LayoutOrder}
                        Padding={new UDim(0, 10)}
                    />

                    {props.entities.map((entity) => (
                        <EntityDisplay
                            key={`${props.location}-${entity.playerID}`}
                            name={entity.name}
                            playerID={entity.playerID}
                            team={entity.team}
                            baseStats={entity.stats}
                            changeableStats={entity.changeableStats}
                        />
                    ))}
                </scrollingframe>
            </>
        );
    }

    return (
        <>
            <textlabel
                Size={new UDim2(1, 0, 0, 20)}
                Position={new UDim2(0, 0, 0, props.yPosition)}
                BackgroundTransparency={1}
                Text={props.title}
                TextColor3={lineColor}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <frame
                Size={new UDim2(1, 0, 1, 0)}
                Position={new UDim2(0, 0, 0, props.yPosition + 20)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 10)}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                />

                {props.entities.map((entity) => (
                    <EntityDisplay
                        key={`${props.location}-${entity.playerID}`}
                        name={entity.name}
                        playerID={entity.playerID}
                        team={entity.team}
                        baseStats={entity.stats}
                        changeableStats={entity.changeableStats}
                    />
                ))}
            </frame>
        </>
    );
}

export = LocationLine;