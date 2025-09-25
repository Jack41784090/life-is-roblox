import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import SquadDisplay from "./SquadDisplay";

interface BattleFieldProps {
    squads: Record<string, Squad[]>;
    currentRound?: number;
}

function BattleField(props: BattleFieldProps) {
    const teamNames: string[] = [];
    for (const [teamName] of pairs(props.squads)) {
        teamNames.push(teamName);
    }

    const totalSquads = teamNames.reduce((total: number, teamName: string) => total + props.squads[teamName].size(), 0);

    const getTeamColor = (teamName: string): Color3 => {
        const colors = [
            new Color3(0.2, 0.6, 1),    // Blue
            new Color3(1, 0.3, 0.3),    // Red  
            new Color3(0.3, 1, 0.3),    // Green
            new Color3(1, 1, 0.3),      // Yellow
            new Color3(1, 0.3, 1),      // Magenta
            new Color3(0.3, 1, 1),      // Cyan
        ];
        const index = teamNames.indexOf(teamName) % colors.size();
        return colors[index];
    };

    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={new Color3(0.05, 0.05, 0.1)}
            BorderSizePixel={0}
        >
            <textlabel
                Size={new UDim2(1, 0, 0, 40)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundTransparency={1}
                Text={`Squad Battle${props.currentRound ? ` - Round ${props.currentRound}` : ""}`}
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
                Font={Enum.Font.GothamBold}
            />

            <frame
                Size={new UDim2(1, 0, .8, 0)}
                Position={new UDim2(0, 0, .2, 0)}
                BackgroundTransparency={1}
            // ScrollBarThickness={10}
            // CanvasSize={new UDim2(0, 0, 0, teamNames.size() * 400 + 50)}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    HorizontalAlignment={"Center"}
                    Padding={new UDim(0, 20)}
                />

                {teamNames.map((teamName, teamIndex) => (
                    <frame
                        key={teamName}
                        Size={new UDim2(.8, 0, .5, 0)}
                        BackgroundColor3={getTeamColor(teamName)}
                        BackgroundTransparency={0.8}
                        BorderColor3={getTeamColor(teamName)}
                        BorderSizePixel={2}
                        LayoutOrder={teamIndex}
                    >
                        <textlabel
                            Size={new UDim2(1, 0, 0, 30)}
                            BackgroundTransparency={1}
                            Text={`Team: ${teamName} (${props.squads[teamName].size()} squads)`}
                            TextColor3={new Color3(1, 1, 1)}
                            TextScaled={true}
                            Font={Enum.Font.GothamBold}
                        />

                        <frame
                            Size={new UDim2(1, 0, 1, 0)}
                            Position={new UDim2(0, 0, .5, 0)}
                            AnchorPoint={new Vector2(0, .5)}
                            BackgroundTransparency={1}
                        >
                            <uilistlayout
                                FillDirection={Enum.FillDirection.Horizontal}
                                SortOrder={Enum.SortOrder.LayoutOrder}
                                // Padding={new UDim(0, 10)}
                                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                            />

                            {props.squads[teamName].map((squad, squadIndex) => {
                                const squadCount = props.squads[teamName].size();
                                const squadWidth = squadCount === 1 ? 0.6 : 1 / squadCount;
                                const offsetWidth = squadCount === 1 ? 0 : -10;

                                return (
                                    <frame
                                        key={`${teamName}-${squad.name}`}
                                        Size={new UDim2(squadWidth, offsetWidth, 1, 0)}
                                        BackgroundTransparency={1}
                                        LayoutOrder={squadIndex}
                                    >
                                        <SquadDisplay
                                            name={squad.name}
                                            team={squad.team}
                                            entities={squad.entities}
                                            position={new UDim2(0, 0, 0, 0)}
                                        />

                                        {/* <SquadStats
                                            squad={squad}
                                            position={new UDim2(1, -250, 0, 0)}
                                        /> */}
                                    </frame>
                                );
                            })}
                        </frame>
                    </frame>
                ))}
            </frame>

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
                        Text={`Teams: ${teamNames.size()}`}
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

                    {teamNames.map((teamName, index) => (
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
        </frame>
    );
}

export = BattleField;