import React from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";

interface Squad {
    name: string;
    team: string;
    entities: SquadEntity[];
}

interface SquadStatsProps {
    squad: Squad;
    position?: UDim2;
}

function SquadStats(props: SquadStatsProps) {
    const getSquadHealth = (): { current: number; max: number } => {
        let currentHP = 0;
        let maxHP = 0;

        props.squad.entities.forEach(entity => {
            if (entity.changeableStats?.HP) {
                currentHP += entity.changeableStats.HP();
            }
            maxHP += 100;
        });

        return { current: currentHP, max: maxHP };
    };

    const getSquadStamina = (): { current: number; max: number } => {
        let currentSTA = 0;
        let maxSTA = 0;

        props.squad.entities.forEach(entity => {
            if (entity.changeableStats?.STA) {
                currentSTA += entity.changeableStats.STA();
            }
            maxSTA += 100;
        });

        return { current: currentSTA, max: maxSTA };
    };

    const getEntityCount = () => {
        return props.squad.entities.size();
    };

    const getAverageStats = () => {
        const entityCount = props.squad.entities.size();
        if (entityCount === 0) return undefined;

        const totals = {
            str: 0,
            dex: 0,
            acr: 0,
            spd: 0,
            int: 0
        };

        props.squad.entities.forEach(entity => {
            if (entity.stats) {
                totals.str += entity.stats.str || 0;
                totals.dex += entity.stats.dex || 0;
                totals.acr += entity.stats.acr || 0;
                totals.spd += entity.stats.spd || 0;
                totals.int += entity.stats.int || 0;
            }
        });

        return {
            str: math.floor(totals.str / entityCount),
            dex: math.floor(totals.dex / entityCount),
            acr: math.floor(totals.acr / entityCount),
            spd: math.floor(totals.spd / entityCount),
            int: math.floor(totals.int / entityCount)
        };
    };

    const health = getSquadHealth();
    const stamina = getSquadStamina();
    const averageStats = getAverageStats();
    const entityCount = getEntityCount();

    const healthPercent = health.max > 0 ? health.current / health.max : 0;
    const staminaPercent = stamina.max > 0 ? stamina.current / stamina.max : 0;

    return (
        <frame
            Position={props.position || new UDim2(0, 0, 0, 0)}
            Size={new UDim2(0, 250, 0, 200)}
            BackgroundColor3={new Color3(0.1, 0.1, 0.15)}
            BackgroundTransparency={0.1}
            BorderColor3={new Color3(0.5, 0.5, 0.6)}
            BorderSizePixel={2}
        >
            <textlabel
                Size={new UDim2(1, 0, 0, 25)}
                BackgroundTransparency={1}
                Text={`${props.squad.name} Stats`}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <frame
                Size={new UDim2(1, -20, 1, -35)}
                Position={new UDim2(0, 10, 0, 30)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 5)}
                />

                <textlabel
                    Size={new UDim2(1, 0, 0, 15)}
                    BackgroundTransparency={1}
                    Text={`Entities: ${entityCount}`}
                    TextColor3={new Color3(0.9, 0.9, 0.9)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    LayoutOrder={1}
                />

                <frame
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    LayoutOrder={2}
                >
                    <textlabel
                        Size={new UDim2(0.4, 0, 1, 0)}
                        BackgroundTransparency={1}
                        Text="Health:"
                        TextColor3={new Color3(1, 0.3, 0.3)}
                        Font={Enum.Font.GothamBold}
                        TextScaled={true}
                        TextXAlignment={Enum.TextXAlignment.Left}
                    />
                    <frame
                        Size={new UDim2(0.6, 0, 1, 0)}
                        Position={new UDim2(0.4, 0, 0, 0)}
                        BackgroundColor3={new Color3(0.2, 0.2, 0.2)}
                        BorderSizePixel={0}
                    >
                        <frame
                            Size={new UDim2(healthPercent, 0, 1, 0)}
                            BackgroundColor3={new Color3(0.8, 0.2, 0.2)}
                            BorderSizePixel={0}
                        />
                        <textlabel
                            Size={new UDim2(1, 0, 1, 0)}
                            BackgroundTransparency={1}
                            Text={`${health.current}/${health.max}`}
                            TextColor3={new Color3(1, 1, 1)}
                            Font={Enum.Font.Gotham}
                            TextScaled={true}
                        />
                    </frame>
                </frame>

                <frame
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    LayoutOrder={3}
                >
                    <textlabel
                        Size={new UDim2(0.4, 0, 1, 0)}
                        BackgroundTransparency={1}
                        Text="Stamina:"
                        TextColor3={new Color3(0.3, 1, 0.3)}
                        Font={Enum.Font.GothamBold}
                        TextScaled={true}
                        TextXAlignment={Enum.TextXAlignment.Left}
                    />
                    <frame
                        Size={new UDim2(0.6, 0, 1, 0)}
                        Position={new UDim2(0.4, 0, 0, 0)}
                        BackgroundColor3={new Color3(0.2, 0.2, 0.2)}
                        BorderSizePixel={0}
                    >
                        <frame
                            Size={new UDim2(staminaPercent, 0, 1, 0)}
                            BackgroundColor3={new Color3(0.2, 0.8, 0.2)}
                            BorderSizePixel={0}
                        />
                        <textlabel
                            Size={new UDim2(1, 0, 1, 0)}
                            BackgroundTransparency={1}
                            Text={`${stamina.current}/${stamina.max}`}
                            TextColor3={new Color3(1, 1, 1)}
                            Font={Enum.Font.Gotham}
                            TextScaled={true}
                        />
                    </frame>
                </frame>

                {averageStats ? (
                    <>
                        <textlabel
                            Size={new UDim2(1, 0, 0, 15)}
                            BackgroundTransparency={1}
                            Text="Average Stats:"
                            TextColor3={new Color3(1, 1, 0.5)}
                            Font={Enum.Font.GothamBold}
                            TextScaled={true}
                            TextXAlignment={Enum.TextXAlignment.Left}
                            LayoutOrder={4}
                        />

                        <frame
                            Size={new UDim2(1, 0, 0, 60)}
                            BackgroundTransparency={1}
                            LayoutOrder={5}
                        >
                            <uilistlayout
                                FillDirection={Enum.FillDirection.Vertical}
                                SortOrder={Enum.SortOrder.LayoutOrder}
                                Padding={new UDim(0, 2)}
                            />

                            {[
                                { label: "STR", value: averageStats.str },
                                { label: "DEX", value: averageStats.dex },
                                { label: "ACR", value: averageStats.acr },
                                { label: "SPD", value: averageStats.spd },
                                { label: "INT", value: averageStats.int }
                            ].map((stat, index) => (
                                <frame
                                    key={stat.label}
                                    Size={new UDim2(1, 0, 0, 10)}
                                    BackgroundTransparency={1}
                                    LayoutOrder={index}
                                >
                                    <textlabel
                                        Size={new UDim2(0.5, 0, 1, 0)}
                                        BackgroundTransparency={1}
                                        Text={stat.label}
                                        TextColor3={new Color3(0.8, 0.8, 0.8)}
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
                        </frame>
                    </>
                ) : undefined}
            </frame>
        </frame>
    );
}

export = SquadStats;