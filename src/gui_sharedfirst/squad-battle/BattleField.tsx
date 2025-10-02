import Object from "@rbxts/object-utils";
import React from "@rbxts/react";
import { iSquadEntity } from "squad-battle/Entity/type";
import { Squad } from "squad-battle/Squad";
import BattleHeader from "./BattleHeader";
import BattleInfoPanel from "./BattleInfoPanel";
import { TeamContainer } from "./team";
import { BattleFieldProps } from "./type";

function BattleField(props: BattleFieldProps) {
    const teamNames: string[] = [];
    const allSquads: Squad[] = [];
    for (const [teamName, squads] of pairs(props.squads)) {
        teamNames.push(teamName);
        squads.forEach(s => allSquads.push(s));
    }

    const allEntities = allSquads.reduce(
        (acc, squad) => [...acc, ...squad.entities], [] as iSquadEntity[]
    );

    const headerYSize = 0.1;
    const bodyYSize = 1 - headerYSize;

    const capableSquads = allSquads.filter(s => !s.isCrippled());
    const usSquads: Squad[] = []; const themSquads: Squad[] = [];
    capableSquads.forEach(s => {
        if (s.team === props.playerTeamName) {
            usSquads.push(s);
        }
        else {
            themSquads.push(s);
        }
    });

    const themUpdates = props.entityUpdates?.filter(u => {
        const affectedEntity = allEntities.find(e => e.playerID === u.affected);
        return affectedEntity?.team !== props.playerTeamName;
    }
    ) || [];
    const usUpdates = props.entityUpdates?.filter(u => {
        const affectedEntity = allEntities.find(e => e.playerID === u.affected);
        return affectedEntity?.team === props.playerTeamName;
    }
    ) || [];

    return (
        <frame
            Size={UDim2.fromScale(1, 1)}
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
                    squads={themSquads}
                    upsideDown={true}
                    entityUpdates={themUpdates.map((u, i) => Object.assign(u, { atSecond: i * props.delayBetweenIndicatorsInSeconds }))}
                    syncAfterSecond={(themUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1}
                />

                <TeamContainer
                    key="US"
                    teamName={props.playerTeamName}
                    Size={UDim2.fromScale(1, .5)}
                    squads={usSquads}
                    entityUpdates={usUpdates.map((u, i) => Object.assign(u, { atSecond: i * props.delayBetweenIndicatorsInSeconds }))}
                    syncAfterSecond={(usUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1}
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