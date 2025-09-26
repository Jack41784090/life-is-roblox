import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import { getTeamColor } from "./shared/utils";

interface BattleInfoPanelProps {
    teamNames: string[];
    squads: Record<string, Squad[]>;
    currentRound?: number;
}

function BattleInfoPanel(props: BattleInfoPanelProps) {
    const totalSquads = props.teamNames.reduce((total: number, teamName: string) => total + props.squads[teamName].size(), 0);

    return (
        <frame
            Size={new UDim2(0, 200, 0, 150)}
            Position={new UDim2(1, -210, 0, 50)}
            BackgroundColor3={new Color3(0, 0, 0)}
            BackgroundTransparency={0.3}
            BorderColor3={new Color3(0.8, 0.8, 0.8)}
            BorderSizePixel={1}
        >
            <textlabel
                Size={new UDim2(1, 0, 0, 25)}
                BackgroundTransparency={1}
                Text="Battle Info"
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
                    Text={`Teams: ${props.teamNames.size()}`}
                    TextColor3={new Color3(0.9, 0.9, 0.9)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    LayoutOrder={1}
                />

                <textlabel
                    Size={new UDim2(1, 0, 0, 15)}
                    BackgroundTransparency={1}
                    Text={`Squads: ${totalSquads}`}
                    TextColor3={new Color3(0.9, 0.9, 0.9)}
                    Font={Enum.Font.Gotham}
                    TextScaled={true}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    LayoutOrder={2}
                />

                {props.currentRound ? (
                    <textlabel
                        Size={new UDim2(1, 0, 0, 15)}
                        BackgroundTransparency={1}
                        Text={`Round: ${props.currentRound}`}
                        TextColor3={new Color3(1, 1, 0.5)}
                        Font={Enum.Font.GothamBold}
                        TextScaled={true}
                        TextXAlignment={Enum.TextXAlignment.Left}
                        LayoutOrder={3}
                    />
                ) : undefined}

                {props.teamNames.map((teamName, index) => (
                    <textlabel
                        key={teamName}
                        Size={new UDim2(1, 0, 0, 12)}
                        BackgroundTransparency={1}
                        Text={`${teamName}: ${props.squads[teamName].size()}`}
                        TextColor3={getTeamColor(teamName)}
                        Font={Enum.Font.Gotham}
                        TextScaled={true}
                        TextXAlignment={Enum.TextXAlignment.Left}
                        LayoutOrder={4 + index}
                    />
                ))}
            </frame>
        </frame>
    );
}

export = BattleInfoPanel;