import React from "@rbxts/react";
import { Squad } from "squad-battle/Squad";
import { EntityUpdate } from "squad-battle/type";
import BattleHeader from "./BattleHeader";
import BattleInfoPanel from "./BattleInfoPanel";
import { TeamContainer } from "./team";

interface BattleFieldProps {
    squads: Record<string, Squad[]>;
    us: string;
    currentRound?: number;
    entityUpdates?: EntityUpdate[];
    delayBetweenIndicatorsInSeconds: number
}

function BattleField(props: BattleFieldProps) {
    const teamNames: string[] = [];
    for (const [teamName] of pairs(props.squads)) {
        teamNames.push(teamName);
    }

    const headerYSize = 0.1;
    const bodyYSize = 1 - headerYSize;

    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundColor3={new Color3(0.05, 0.05, 0.1)}
            BorderSizePixel={0}
        >
            <BattleHeader
                Size={UDim2.fromScale(1, headerYSize)}
                currentRound={props.currentRound} />

            <frame
                Size={UDim2.fromScale(1, bodyYSize)}
                Position={new UDim2(0, 0, headerYSize, 0)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    HorizontalAlignment={'Center'}
                    VerticalAlignment={'Top'}
                    Padding={new UDim(0, 5)}
                />


                <TeamContainer
                    key="THEM"
                    teamName="THEM"
                    Size={UDim2.fromScale(1, .5)}
                    squads={(() => {
                        const whoisthem: Squad[] = [];
                        for (const [k, v] of pairs(props.squads)) {
                            if (k !== props.us) v.forEach(s => { if (!s.isCrippled()) whoisthem.push(s); });
                        }
                        return whoisthem
                    })()}
                    upsideDown={true}
                    entityUpdates={props.entityUpdates?.map((u, i) => {
                        return { ...u, atSecond: i * props.delayBetweenIndicatorsInSeconds };
                    })}
                    syncAfterSecond={props.entityUpdates ? (props.entityUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1 : 0}
                />

                <TeamContainer
                    key="US"
                    teamName={props.us}
                    Size={UDim2.fromScale(1, .5)}
                    squads={props.squads[props.us].filter(s => !s.isCrippled())}
                    entityUpdates={props.entityUpdates?.map((u, i) => {
                        return { ...u, atSecond: i * props.delayBetweenIndicatorsInSeconds };
                    })}
                    syncAfterSecond={props.entityUpdates ? (props.entityUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1 : 0}
                />
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