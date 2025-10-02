import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { EntityStatsProps } from "../type";

function EntityStats(props: EntityStatsProps) {
    const hp = useAtom(props.changeableStats.HP);
    const sta = useAtom(props.changeableStats.STA);

    return (
        <>
            <textlabel
                Size={new UDim2(1, 0, 0.2, 0)}
                Position={new UDim2(0, 0, 0.25, 0)}
                BackgroundTransparency={1}
                Text={`HP: ${hp}`}
                TextColor3={new Color3(0.9, 0.9, 0.9)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />

            <textlabel
                Size={new UDim2(1, 0, 0.2, 0)}
                Position={new UDim2(0, 0, 0.45, 0)}
                BackgroundTransparency={1}
                Text={`STA: ${sta}`}
                TextColor3={new Color3(0.9, 0.9, 0.9)}
                TextScaled={true}
                Font={Enum.Font.Gotham}
            />
        </>
    );
}

export = EntityStats;