import React from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { EntityBaseStats, EntityChangeableStats } from "squad-battle/type";

interface EntityStatsProps {
    name: string;
    baseStats: EntityBaseStats;
    changeableStats: EntityChangeableStats;
}

function EntityStats(props: EntityStatsProps) {
    const hp = useAtom(props.changeableStats.HP);
    const sta = useAtom(props.changeableStats.STA);
    const org = useAtom(props.changeableStats.ORG);
    const pos = useAtom(props.changeableStats.POS);
    const mag = useAtom(props.changeableStats.MAG);

    const statRows = [
        { label: "STR", value: props.baseStats.str },
        { label: "DEX", value: props.baseStats.dex },
        { label: "ACR", value: props.baseStats.acr },
        { label: "SPD", value: props.baseStats.spd },
        { label: "SIZ", value: props.baseStats.siz },
        { label: "INT", value: props.baseStats.int },
        { label: "SPR", value: props.baseStats.spr },
        { label: "FAI", value: props.baseStats.fai },
        { label: "CHA", value: props.baseStats.cha },
        { label: "BEU", value: props.baseStats.beu },
        { label: "WIL", value: props.baseStats.wil },
        { label: "END", value: props.baseStats.end }
    ];

    const changeableStatRows = [
        { label: "HP", value: hp, color: new Color3(0.8, 0.2, 0.2) },
        { label: "STA", value: sta, color: new Color3(0.2, 0.8, 0.2) },
        { label: "ORG", value: org, color: new Color3(0.8, 0.8, 0.2) },
        { label: "POS", value: pos, color: new Color3(0.2, 0.2, 0.8) },
        { label: "MAG", value: mag, color: new Color3(0.8, 0.2, 0.8) }
    ];

    return (
        <frame
            Size={new UDim2(0, 300, 0, 400)}
            Position={new UDim2(0, 0, 0, 0)}
            BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
            BackgroundTransparency={0.2}
            BorderColor3={new Color3(0.8, 0.8, 0.8)}
            BorderSizePixel={1}
        >
            <textlabel
                Size={new UDim2(1, 0, 0, 30)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={props.name}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <scrollingframe
                Size={new UDim2(1, 0, 1, -30)}
                Position={new UDim2(0, 0, 0, 30)}
                BackgroundTransparency={1}
                ScrollBarThickness={8}
                CanvasSize={new UDim2(0, 0, 0, (statRows.size() + changeableStatRows.size()) * 25 + 40)}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 2)}
                />

                <textlabel
                    Size={new UDim2(1, 0, 0, 25)}
                    BackgroundTransparency={1}
                    Text="BASE STATS"
                    TextColor3={new Color3(0.8, 0.8, 0.8)}
                    Font={Enum.Font.GothamBold}
                    TextScaled={true}
                    LayoutOrder={0}
                />

                {statRows.map((stat, index) => (
                    <frame
                        key={`base-${stat.label}`}
                        Size={new UDim2(1, 0, 0, 20)}
                        BackgroundTransparency={1}
                        LayoutOrder={index + 1}
                    >
                        <textlabel
                            Size={new UDim2(0.5, 0, 1, 0)}
                            BackgroundTransparency={1}
                            Text={stat.label}
                            TextColor3={new Color3(0.9, 0.9, 0.9)}
                            Font={Enum.Font.Gotham}
                            TextScaled={true}
                            TextXAlignment={Enum.TextXAlignment.Left}
                        />
                        <textlabel
                            Size={new UDim2(0.5, 0, 1, 0)}
                            Position={new UDim2(0.5, 0, 0, 0)}
                            BackgroundTransparency={1}
                            Text={tostring(stat.value)}
                            TextColor3={new Color3(1, 1, 1)}
                            Font={Enum.Font.Gotham}
                            TextScaled={true}
                            TextXAlignment={Enum.TextXAlignment.Right}
                        />
                    </frame>
                ))}

                <textlabel
                    Size={new UDim2(1, 0, 0, 25)}
                    BackgroundTransparency={1}
                    Text="CHANGEABLE STATS"
                    TextColor3={new Color3(0.8, 0.8, 0.8)}
                    Font={Enum.Font.GothamBold}
                    TextScaled={true}
                    LayoutOrder={statRows.size() + 1}
                />

                {changeableStatRows.map((stat, index) => (
                    <frame
                        key={`changeable-${stat.label}`}
                        Size={new UDim2(1, 0, 0, 20)}
                        BackgroundTransparency={1}
                        LayoutOrder={statRows.size() + index + 2}
                    >
                        <textlabel
                            Size={new UDim2(0.5, 0, 1, 0)}
                            BackgroundTransparency={1}
                            Text={stat.label}
                            TextColor3={stat.color}
                            Font={Enum.Font.GothamBold}
                            TextScaled={true}
                            TextXAlignment={Enum.TextXAlignment.Left}
                        />
                        <textlabel
                            Size={new UDim2(0.5, 0, 1, 0)}
                            Position={new UDim2(0.5, 0, 0, 0)}
                            BackgroundTransparency={1}
                            Text={tostring(stat.value)}
                            TextColor3={new Color3(1, 1, 1)}
                            Font={Enum.Font.Gotham}
                            TextScaled={true}
                            TextXAlignment={Enum.TextXAlignment.Right}
                        />
                    </frame>
                ))}
            </scrollingframe>
        </frame>
    );
}

export = EntityStats;