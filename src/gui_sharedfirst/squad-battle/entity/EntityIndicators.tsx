import React, { useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { DamageIndicator } from "gui_sharedfirst/new_components/effects";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import { EntityUpdateIndicator, IndicatorType, ProtoIndicator } from "./types";

function EntityIndicators({ updates, }: { updates: EntityUpdateIndicator[], }) {
    const [indicators, setIndicators] = useState<Array<ProtoIndicator>>([]);
    const [pendingIndicators, setPendingIndicators] = useState<Array<ProtoIndicator>>([]);
    const runnerRef = useRef<RBXScriptConnection | undefined>();
    const processedUpdatesRef = useRef<Set<string>>(new Set());

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
                    atSecond: update.atSecond,
                    onComplete: update.onComplete,
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
                    atSecond: update.atSecond,
                    onComplete: update.onComplete,
                }
            }

            case 'LOC': {
                const dloc = update.change.to - update.change.from;
                if (dloc > 0) {
                    return {
                        T: IndicatorType.Retreat,
                        id: tick() * 1000,
                        value: dloc,
                        position: UDim2.fromScale(.5, .5),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                    };
                }
                else {
                    return {
                        T: IndicatorType.Advance,
                        id: tick() * 1000,
                        value: dloc,
                        position: UDim2.fromScale(.5, .5),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                    };
                }
            }
        }
    }

    const removeIndicator = (id: number) => {
        setIndicators(prev => prev.filter(indicator => indicator.id !== id));
    };


    // Create a stable reference for updates to prevent infinite loops
    const updatesKey = useMemo(() => {
        warn("| | | | | updating key")
        if (!updates || updates.size() === 0) return "";
        // Sort updates to ensure consistent ordering regardless of array order
        const sortedUpdates = [...updates].sort((a, b) => {
            return a.atSecond < b.atSecond;
        });

        return sortedUpdates.map(u => {
            // Include source and affected to make the key more specific
            const baseKey = `${u.source}->${u.affected}`;
            const changeStr = `${u.change.property}`;
            const valueStr = typeOf(u.change) === "table" && "from" in u.change ? `${u.change.from}to${u.change.to}` : "";
            const timeStr = `@${math.floor(u.atSecond * 100) / 100}`; // Round to avoid floating point precision issues
            return `${baseKey}:${changeStr}${valueStr}${timeStr}`;
        }).join("|");
    }, [updates]);

    useEffect(() => {
        if (!updates || updates.size() === 0 || !updatesKey) return;

        // Prevent duplicate processing
        if (processedUpdatesRef.current.has(updatesKey)) {
            // warn(`Skipping duplicate updates: ${updatesKey.sub(1, 100)}...`);
            return;
        }
        processedUpdatesRef.current.add(updatesKey);

        // Clean old processed updates to prevent memory leak
        if (processedUpdatesRef.current.size() > 100) {
            processedUpdatesRef.current.clear();
        }

        warn(`Processing updates: ${updatesKey.sub(1, 100)}...`);
        const newIndicators: Array<ProtoIndicator> = [];
        updates.forEach((update, index) => {
            const r = categoriseUpdate(update);
            if (r) {
                newIndicators.push(r);
            }
        });

        if (newIndicators.size() > 0) {
            // Separate immediate indicators from timed ones
            const immediateIndicators = newIndicators.filter(ind => ind.atSecond <= 0);
            const timedIndicators = newIndicators.filter(ind => ind.atSecond > 0);

            // warn(`${immediateIndicators.size()} immediate, ${timedIndicators.size()} timed indicators`);

            // Show immediate indicators right away
            if (immediateIndicators.size() > 0) {
                setIndicators(prev => [...prev, ...immediateIndicators]);
            }

            // Replace pending indicators entirely to avoid spam
            if (timedIndicators.size() > 0) {
                setPendingIndicators(timedIndicators);
            }
        }
    }, [updatesKey]);

    // Separate effect to handle the timing runner
    useEffect(() => {
        if (pendingIndicators.size() === 0) return;
        if (runnerRef.current) {
            // Disconnect existing runner first
            runnerRef.current.Disconnect();
            runnerRef.current = undefined;
        }

        // warn(`Starting timer for ${pendingIndicators.size()} pending indicators`);
        let adt = 0;
        let currentQueue = [...pendingIndicators];
        currentQueue.sort((a, b) => a.atSecond < b.atSecond);

        const connection = RunService.Heartbeat.Connect((dt) => {
            adt += dt;

            // Process all indicators that should show now
            const indicatorsToShow: ProtoIndicator[] = [];
            while (currentQueue.size() > 0 && adt >= currentQueue[0].atSecond) {
                const indicatorToShow = currentQueue.shift()!;
                indicatorsToShow.push(indicatorToShow);
                warn(`Showing timed indicator: ${IndicatorType[indicatorToShow.T]} at ${adt}s`);
            }

            // Add all indicators that should show this frame
            if (indicatorsToShow.size() > 0) {
                setIndicators(prev => [...prev, ...indicatorsToShow]);
            }

            // If no more indicators to show, cleanup
            if (currentQueue.size() === 0) {
                // warn(`All timed indicators processed, cleaning up`);
                connection.Disconnect();
                runnerRef.current = undefined;
                setPendingIndicators([]);
            }
        });

        runnerRef.current = connection;

        return () => {
            connection.Disconnect();
        };
    }, [pendingIndicators]);



    // Cleanup effect
    useEffect(() => {
        return () => {
            if (runnerRef.current) {
                runnerRef.current.Disconnect();
                runnerRef.current = undefined;
            }
        };
    }, []);

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
                                onComplete={() => {
                                    removeIndicator(indicator.id);
                                    if (indicator.onComplete) {
                                        indicator.onComplete();
                                    }
                                }}
                            />)
                    case IndicatorType.Advance:
                        return (
                            <ClashFateEffect
                                fate={"➡️"}
                                position={indicator.position}
                                onComplete={() => {
                                    removeIndicator(indicator.id);
                                    if (indicator.onComplete) {
                                        indicator.onComplete();
                                    }
                                }}
                            />
                        )

                    case IndicatorType.Retreat:
                    case IndicatorType.Death:
                        return (
                            <ClashFateEffect
                                fate={indicator.T === IndicatorType.Death ? "💀" : "🏳️"}
                                position={indicator.position}
                                onComplete={() => {
                                    removeIndicator(indicator.id);
                                    if (indicator.onComplete) {
                                        indicator.onComplete();
                                    }
                                }}
                            />
                        )
                }
            })}
        </frame>
    )
}
export = EntityIndicators;
