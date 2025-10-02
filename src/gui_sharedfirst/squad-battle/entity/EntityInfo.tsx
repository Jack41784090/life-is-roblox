import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { getLocationText } from "../shared/utils";
import { EntityInfoProps } from "../type";

function EntityInfo(props: EntityInfoProps) {
    const loc = useAtom(props.changeableStats.LOC);

    return (
        <>
            <textlabel
                Size={new UDim2(1, 0, 0.25, 0)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={props.name}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.15, 0)}
                Position={new UDim2(0, 0, 0.65, 0)}
                BackgroundTransparency={1}
                Text={getLocationText(loc)}
                TextColor3={new Color3(1, 1, 0.5)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.15, 0)}
                Position={new UDim2(0, 0, 0.8, 0)}
                BackgroundTransparency={1}
                Text={`ID: ${props.playerID}`}
                TextColor3={new Color3(0.7, 0.7, 0.7)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />
        </>
    );
}

export = EntityInfo;