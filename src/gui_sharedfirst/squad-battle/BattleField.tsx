import Object from "@rbxts/object-utils";
import React, { useCallback, useEffect } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { iSquadEntity } from "squad-battle/Entity/type";
import { Squad } from "squad-battle/Squad";
import BattleHeader from "./BattleHeader";
import BattleInfoPanel from "./BattleInfoPanel";
import { EntityUpdateIndicator } from "./entity/types";
import { TeamContainer } from "./team";
import { BattleFieldProps } from "./type";

function BattleField(props: BattleFieldProps) {
    if (props.enableDebugWarns) warn(`Battlefield: ${math.random() * 100 / 100}`)

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

    const timerRef = React.useRef<RBXScriptConnection | undefined>();
    const timeRef = React.useRef(0);
    const secondRef = React.useRef(0);

    if (timerRef.current) {
        timerRef.current.Disconnect();
        timerRef.current = undefined;
    }
    timeRef.current = -props.delayBetweenIndicatorsInSeconds * (props.entityUpdates?.size() ?? 0); // Start negative so first indicator shows at 0s
    secondRef.current = 0;
    if (props.enableDebugWarns) warn(`BattleField rerendered. Timer reset to 0s.`);

    const getTimer = useCallback(() => {
        if (timerRef.current) {
            return timeRef.current;
        }
        else {
            timerRef.current = RunService.Heartbeat.Connect(dt => {
                timeRef.current += dt;
                const newSecond = math.floor(timeRef.current);
                if (newSecond !== secondRef.current) {
                    secondRef.current = newSecond;
                    if (props.enableDebugWarns) warn(`BattleField timer: ${secondRef.current}s`);
                }
            });
            return timeRef.current;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                timerRef.current.Disconnect();
                timerRef.current = undefined;
            }
            if (props.enableDebugWarns) warn(`BattleField unmounted. Timer stopped at ${timeRef.current}s.`);
        }
    }, [])

    const updateIndicators: EntityUpdateIndicator[] =
        props.entityUpdates?.map((u, i) => Object.assign(u, { atSecond: i * props.delayBetweenIndicatorsInSeconds })) || [];
    const themUpdates = updateIndicators.filter(u => {
        const sourceEntity = allEntities.find(e => e.playerID === u.source);
        const affectedEntity = allEntities.find(e => e.playerID === u.affected);
        return sourceEntity?.team !== props.playerTeamName || affectedEntity?.team !== props.playerTeamName;
    }
    ) || [];
    const usUpdates = updateIndicators.filter(u => {
        const sourceEntity = allEntities.find(e => e.playerID === u.source);
        const affectedEntity = allEntities.find(e => e.playerID === u.affected);
        return sourceEntity?.team === props.playerTeamName || affectedEntity?.team === props.playerTeamName;
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
                    getTimer={getTimer}
                    key="THEM"
                    teamName="THEM"
                    Size={UDim2.fromScale(1, .5)}
                    squads={themSquads}
                    upsideDown={true}
                    entityUpdates={themUpdates}
                    syncAfterSecond={(themUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1}
                    enableDebugWarns={props.enableDebugWarns}
                />

                <TeamContainer
                    getTimer={getTimer}
                    key="US"
                    teamName={props.playerTeamName}
                    Size={UDim2.fromScale(1, .5)}
                    squads={usSquads}
                    entityUpdates={usUpdates}
                    syncAfterSecond={(usUpdates.size() - 1) * props.delayBetweenIndicatorsInSeconds + 1}
                    enableDebugWarns={props.enableDebugWarns}
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