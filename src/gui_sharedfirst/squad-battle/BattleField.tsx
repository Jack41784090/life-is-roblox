import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import BattleHeader from "./BattleHeader";
import BattleInfoPanel from "./BattleInfoPanel";
import { getTeamColor } from "./shared/utils";
import TeamContainer from "./team/TeamContainer";

interface BattleFieldProps {
    squads: Record<string, Squad[]>;
    currentRound?: number;
}

function BattleField(props: BattleFieldProps) {
    const teamNames: string[] = [];
    for (const [teamName] of pairs(props.squads)) {
        teamNames.push(teamName);
    }

    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={new Color3(0.05, 0.05, 0.1)}
            BorderSizePixel={0}
        >
            <BattleHeader currentRound={props.currentRound} />

            <frame
                Size={new UDim2(1, 0, .8, 0)}
                Position={new UDim2(0, 0, .2, 0)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    HorizontalAlignment={"Center"}
                // Padding={new UDim(0, 20)}
                />

                {teamNames.map((teamName, teamIndex) => (
                    <TeamContainer
                        key={teamName}
                        teamName={teamName}
                        squads={props.squads[teamName]}
                        teamColor={getTeamColor(teamName)}
                        teamIndex={teamIndex}
                    />
                ))}
            </frame>

            <BattleInfoPanel
                teamNames={teamNames}
                squads={props.squads}
                currentRound={props.currentRound}
            />
        </frame>
    );
}

export = BattleField;