import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { DamageIndicator } from "gui_sharedfirst/new_components/effects";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import { springs } from "shared/utils";
import { EntityPortraitProps } from "../type";
import { EntityUpdateIndicator, IndicatorType, ProtoIndicator } from "./types";

interface EntityPortraitWithIndicatorsProps extends Omit<EntityPortraitProps, 'isAttacking' | 'isRetreating' | 'isDying'> {
    updates: EntityUpdateIndicator[];
    myID: number;
}

function EntityPortraitWithIndicators({
    portraitImage,
    upsideDown = false,
    updates,
    myID
}: EntityPortraitWithIndicatorsProps) {
    // Animation states - centralized here
    const [isAttacking, setIsAttacking] = useState(false);
    const [isRetreating, setIsRetreating] = useState(false);
    const [isDying, setIsDying] = useState(false);

    // Motion controls
    const [rotation, rotationMotion] = useMotion(0);
    const [scale, scaleMotion] = useMotion(1);

    // Animation cleanup refs
    const animationCleanupRef = useRef<thread | undefined>();
    const isAnimatingRef = useRef(false);

    // Indicator state
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
                    // Add animation triggers
                    animationTrigger: update.change.property === 'DIE' ? 'die' : 'retreat'
                }
            }
            case "HP": {
                if (update.affected === myID) {
                    const dHP = update.change.to - update.change.from;
                    const randomX = 0.3 + math.random() * 0.4;
                    const randomY = 0.2 + math.random() * 0.6;
                    return {
                        T: dHP > 0 ? IndicatorType.Heal : IndicatorType.Damage,
                        id: tick() * 1000,
                        value: dHP,
                        position: UDim2.fromScale(randomX, randomY),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                    }
                }
                else if (update.source === myID) {
                    return {
                        T: IndicatorType.Null,
                        id: tick() * 1000,
                        value: -1,
                        position: UDim2.fromScale(0, 0),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                        // Add attack animation trigger for outgoing damage
                        animationTrigger: 'attack'
                    }
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
                        animationTrigger: 'retreat'
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
                        animationTrigger: 'advance'
                    };
                }
            }
        }
    }

    const removeIndicator = (id: number) => {
        setIndicators(prev => prev.filter(indicator => indicator.id !== id));
    };

    // Trigger animations based on indicator type
    const triggerAnimation = (animationType: string) => {
        switch (animationType) {
            case 'attack':
                setIsAttacking(true);
                break;
            case 'retreat':
                setIsRetreating(true);
                break;
            case 'advance':
                setIsRetreating(false);
                break;
            case 'die':
                setIsDying(true);
                break;
        }
    };

    // Create stable reference for updates
    const updatesKey = useMemo(() => {
        if (!updates || updates.size() === 0) return "";
        const sortedUpdates = [...updates].sort((a, b) => a.atSecond < b.atSecond);
        return sortedUpdates.map(u => {
            const baseKey = `${u.source}->${u.affected}`;
            const changeStr = `${u.change.property}`;
            const valueStr = typeOf(u.change) === "table" && "from" in u.change ? `${u.change.from}to${u.change.to}` : "";
            const timeStr = `@${math.floor(u.atSecond * 100) / 100}`;
            return `${baseKey}:${changeStr}${valueStr}${timeStr}`;
        }).join("|");
    }, [updates]);

    // Process updates and create indicators
    useEffect(() => {
        if (!updates || updates.size() === 0 || !updatesKey) return;

        if (processedUpdatesRef.current.has(updatesKey)) return;
        processedUpdatesRef.current.add(updatesKey);

        if (processedUpdatesRef.current.size() > 100) {
            processedUpdatesRef.current.clear();
        }

        const newIndicators: Array<ProtoIndicator> = [];
        updates.forEach((update, index) => {
            const r = categoriseUpdate(update);
            if (r) {
                newIndicators.push(r);
            }
        });

        if (newIndicators.size() > 0) {
            const immediateIndicators = newIndicators.filter(ind => ind.atSecond <= 0);
            const timedIndicators = newIndicators.filter(ind => ind.atSecond > 0);

            // Trigger immediate animations
            immediateIndicators.forEach(ind => {
                if (ind.animationTrigger) {
                    triggerAnimation(ind.animationTrigger);
                }
            });

            if (immediateIndicators.size() > 0) {
                setIndicators(prev => [...prev, ...immediateIndicators]);
            }

            if (timedIndicators.size() > 0) {
                setPendingIndicators(timedIndicators);
            }
        }
    }, [updatesKey]);

    // Handle timed indicators with animation sync
    useEffect(() => {
        if (pendingIndicators.size() === 0) return;
        if (runnerRef.current) {
            runnerRef.current.Disconnect();
            runnerRef.current = undefined;
        }

        let adt = 0;
        let currentQueue = [...pendingIndicators];
        currentQueue.sort((a, b) => a.atSecond < b.atSecond);

        const connection = RunService.Heartbeat.Connect((dt) => {
            adt += dt;

            const indicatorsToShow: ProtoIndicator[] = [];
            while (currentQueue.size() > 0 && adt >= currentQueue[0].atSecond) {
                const indicatorToShow = currentQueue.shift()!;
                indicatorsToShow.push(indicatorToShow);

                // Trigger animation when indicator shows (perfect sync)
                if (indicatorToShow.animationTrigger) {
                    triggerAnimation(indicatorToShow.animationTrigger);
                }
            }

            if (indicatorsToShow.size() > 0) {
                setIndicators(prev => [...prev, ...indicatorsToShow]);
            }

            if (currentQueue.size() === 0) {
                connection.Disconnect();
                runnerRef.current = undefined;
                setPendingIndicators([]);
            }
        });

        runnerRef.current = connection;
        return () => connection.Disconnect();
    }, [pendingIndicators]);

    // Attack animation
    useEffect(() => {
        if (isAttacking && !isAnimatingRef.current) {
            isAnimatingRef.current = true;

            if (animationCleanupRef.current) {
                task.cancel(animationCleanupRef.current);
            }

            scaleMotion.set(1);

            animationCleanupRef.current = task.spawn(() => {
                scaleMotion.tween(1.6, {
                    time: 0.1,
                    style: Enum.EasingStyle.Back,
                    direction: Enum.EasingDirection.Out,
                });

                task.wait(0.1);

                scaleMotion.tween(1, {
                    time: 0.15,
                    style: Enum.EasingStyle.Back,
                    direction: Enum.EasingDirection.In,
                });

                task.wait(0.15);

                isAnimatingRef.current = false;
                animationCleanupRef.current = undefined;
                setIsAttacking(false);
            });
        }
    }, [isAttacking]);

    // Death animation
    useEffect(() => {
        if (isDying) {
            rotationMotion.spring(360 + 1080 * math.random(), springs.responsive);
            scaleMotion.tween(0, {
                time: 1,
                style: Enum.EasingStyle.Exponential,
                direction: Enum.EasingDirection.In,
            });
        }
    }, [isDying]);

    // Retreat animation
    useEffect(() => {
        scaleMotion.tween(isRetreating ? 0 : 1, {
            time: 1,
            style: Enum.EasingStyle.Exponential,
            direction: Enum.EasingDirection.In,
        });
    }, [isRetreating]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationCleanupRef.current) {
                task.cancel(animationCleanupRef.current);
            }
            if (runnerRef.current) {
                runnerRef.current.Disconnect();
            }
        };
    }, []);

    return (
        <>
            {/* Portrait Frame */}
            <frame
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={scale.map(s => UDim2.fromScale(0.5, upsideDown ?
                    .5 - .5 * (1 - s) :
                    .5 + .5 * (1 - s)))}
                Size={scale.map(s => UDim2.fromScale(0.8 * s, 0.8 * s))}
                BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
                ZIndex={0}
                Rotation={rotation}
                Transparency={isDying ? 1 : 0}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
                <imagelabel
                    Image={portraitImage}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Position={UDim2.fromScale(0.5, 0.5)}
                    Size={UDim2.fromScale(0.85, 0.85)}
                    BackgroundTransparency={1}
                    ZIndex={0}
                    ScaleType={Enum.ScaleType.Crop}
                >
                    <uicorner CornerRadius={new UDim(1, 0)} />
                </imagelabel>
            </frame>

            {/* Indicators Frame */}
            <frame BackgroundTransparency={1} Size={UDim2.fromScale(1, 1)}>
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
                                />
                            );

                        case IndicatorType.Advance:
                            return (
                                <ClashFateEffect
                                    key={indicator.id}
                                    fate={"➡️"}
                                    position={indicator.position}
                                    onComplete={() => {
                                        removeIndicator(indicator.id);
                                        if (indicator.onComplete) {
                                            indicator.onComplete();
                                        }
                                    }}
                                />
                            );

                        case IndicatorType.Retreat:
                        case IndicatorType.Death:
                            return (
                                <ClashFateEffect
                                    key={indicator.id}
                                    fate={indicator.T === IndicatorType.Death ? "💀" : "🏳️"}
                                    position={indicator.position}
                                    onComplete={() => {
                                        removeIndicator(indicator.id);
                                        if (indicator.onComplete) {
                                            indicator.onComplete();
                                        }
                                    }}
                                />
                            );

                        case IndicatorType.Null:
                            if (indicator.onComplete) {
                                indicator.onComplete();
                            }
                            removeIndicator(indicator.id);
                            return undefined;
                    }
                })}
            </frame>
        </>
    );
}

export = EntityPortraitWithIndicators;