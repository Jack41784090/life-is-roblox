import React, { useEffect, useState } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { DamageIndicator } from "gui_sharedfirst/new_components/effects";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import { EntityUpdateIndicator, IndicatorType, ProtoIndicator } from "./types";

function EntityIndicators({ updates, }: { updates: EntityUpdateIndicator[], }) {
    const [indicators, setIndicators] = useState<Array<ProtoIndicator>>([]);
    const categoriseUpdate = (update: EntityUpdateIndicator): ProtoIndicator | undefined => {
        switch (update.change.property) {
            case 'DIE':
            case 'RETREAT':
            case 'LEAVE': {
                return {
                    T: update.change.property === 'DIE' ? IndicatorType.Death : IndicatorType.Retreat,
                    id: tick() * 1000,
                    value: 0,
                    position: UDim2.fromScale(.5, .5),
                    atSecond: update.atSecond
                }
            }
            case "HP": {
                const dHP = update.change.to - update.change.from;
                const randomX = 0.3 + math.random() * 0.4; // Between 0.3 and 0.7
                const randomY = 0.2 + math.random() * 0.6; // Between 0.2 and 0.8
                return {
                    T: dHP > 0 ? IndicatorType.Heal : IndicatorType.Damage,
                    id: tick() * 1000,
                    value: dHP,
                    position: UDim2.fromScale(randomX, randomY),
                    atSecond: update.atSecond
                }
            }

            case 'LOC': {
                const dloc = update.change.to - update.change.from;
                if (dloc > 0) { // Retreating
                    // setIsRetreating(true);
                    // newIndicators.push({
                    //     T: IndicatorType.Retreat,
                    //     id: tick() * 1000 + index,
                    //     value: dloc,
                    //     position: UDim2.fromScale(.5, .5)
                    // });
                }
            }
        }
    }
    let runner: RBXScriptConnection | undefined;
    const newIndicators: Array<ProtoIndicator> = [];
    const signalledToCleanUpIds: number[] = []
    const removeIndicator = (id: number) => {
        // setIndicators(prev => prev.filter(indicator => indicator.id !== id));
        signalledToCleanUpIds.push(id);
    };
    const signalRunnerToBegin = () => {
        let adt = 0;
        let queuedIndicator = newIndicators.shift();
        if (!queuedIndicator) return;

        runner = RunService.Heartbeat.Connect((dt) => {
            adt += dt;
            if (adt > queuedIndicator!.atSecond) {
                // print(`${queu}: ${}`)
                setIndicators(prev => [...prev, queuedIndicator!])
                queuedIndicator = newIndicators.shift();
                if (!queuedIndicator) {
                    runner?.Disconnect();
                    setIndicators(prev => prev.filter(indicator => !signalledToCleanUpIds.includes(indicator.id)));
                    signalledToCleanUpIds.clear()
                }
            }
        })

    }


    useEffect(() => {
        if (!updates || updates.size() === 0) return;

        updates.forEach((update, index) => {
            const r = categoriseUpdate(update);
            if (r) {
                newIndicators.push(r);
            }
        });

        if (newIndicators.size() > 0) {
            // setIndicators(prev => [...prev, ...newIndicators]);
            signalRunnerToBegin();
        }

        return (() => {
            runner?.Disconnect();
        })
    }, [updates]);

    return (
        <frame>
            {indicators.map((indicator) => {
                switch (indicator.T) {
                    case IndicatorType.Damage:
                    case IndicatorType.Heal:
                        return (
                            <DamageIndicator
                                key={indicator.id}
                                value={indicator.value}
                                position={indicator.position}
                                onComplete={() => removeIndicator(indicator.id)}
                            />)
                    case IndicatorType.Retreat:
                    case IndicatorType.Death:
                        return (
                            <ClashFateEffect
                                fate={indicator.T === IndicatorType.Death ? "💀" : "🏳️"}
                                position={indicator.position}
                                onComplete={() => removeIndicator(indicator.id)}
                            />
                        )
                }
            })}
        </frame>
    )
}
export = EntityIndicators;
