import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { DamageIndicator } from "gui_sharedfirst/new_components/effects";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { CONDOR_BLOOD_RED } from "shared/const";
import { springs } from "shared/utils";
import { SquadEntity } from "squad-battle/Entity";
import { EntityPortraitProps } from "../type";
import { EntityUpdateIndicator, IndicatorType, ProtoIndicator } from "./types";

interface EntityVisualsProps extends Omit<EntityPortraitProps, 'isAttacking' | 'isRetreating' | 'isDying'> {
    updates: EntityUpdateIndicator[];
    myID: number;
    entity: SquadEntity;
}

function EntityVisuals({
    portraitImage,
    upsideDown = false,
    updates,
    myID,
    entity
}: EntityVisualsProps) {
    warn(`| | | | | | Entity Visual`)

    // Animation states - centralized here
    const [isAttacking, setIsAttacking] = useState(false);
    const [isRetreating, setIsRetreating] = useState(false);
    const [isDying, setIsDying] = useState(false);

    // Motion controls for portrait
    const [rotation, rotationMotion] = useMotion(0);
    const [scale, scaleMotion] = useMotion(1);

    // Bar motion controls - synced with damage indicators
    const [hpRatio, hpMotion] = useMotion(1);
    const [orgRatio, orgMotion] = useMotion(1);

    // Animation cleanup refs
    const animationCleanupRef = useRef<thread | undefined>();
    const isAnimatingRef = useRef(false);

    // Indicator state
    const [indicators, setIndicators] = useState<Array<ProtoIndicator>>([]);
    const [pendingIndicators, setPendingIndicators] = useState<Array<ProtoIndicator>>([]);
    const runnerRef = useRef<RBXScriptConnection | undefined>();
    const processedUpdatesRef = useRef<Set<string>>(new Set());
    const adtRef = useRef(0);

    // Entity stats for bar calculations
    const currentHP = entity.changeableStats.HP();
    const currentORG = entity.changeableStats.ORG();
    const maxHP = entity.calculateRealityValue(Reality.HP);
    const maxORG = entity.calculateRealityValue(Reality.Guts);

    const categoriseUpdate = (update: EntityUpdateIndicator): ProtoIndicator | undefined => {
        warn(`[EntityVisuals:${myID}] Processing update: ${update.change.property} from ${update.source} to ${update.affected} at ${update.atSecond}s`);

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
                    animationTrigger: update.change.property === 'DIE' ? 'die' : 'retreat'
                }
                break;
            }
            case "HP": {
                if (update.affected === myID) {
                    const dHP = update.change.to - update.change.from;
                    warn(`[EntityVisuals:${myID}] HP change: ${update.change.from} -> ${update.change.to} (dHP: ${dHP}) [Source: ${update.source}]`);
                    const randomX = 0.3 + math.random() * 0.4;
                    const randomY = 0.2 + math.random() * 0.6;
                    return {
                        T: dHP > 0 ? IndicatorType.Heal : IndicatorType.Damage,
                        id: tick() * 1000,
                        value: dHP,
                        position: UDim2.fromScale(randomX, randomY),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                        // Add HP bar sync trigger
                        barSyncData: {
                            type: 'hp',
                            newValue: update.change.to,
                            maxValue: maxHP
                        }
                    }
                }
                else if (update.source === myID) {
                    warn(`[EntityVisuals:${myID}] Attack trigger: Damaging entity ${update.affected} (HP: ${update.change.from} -> ${update.change.to}) at ${update.atSecond}s`);
                    return {
                        T: IndicatorType.Null,
                        id: tick() * 1000,
                        value: -1,
                        position: UDim2.fromScale(0, 0),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                        animationTrigger: 'attack'
                    }
                }
                break;
            }
            case 'ORG': {
                if (update.affected === myID) {
                    const dORG = update.change.to - update.change.from;
                    warn(`[EntityVisuals:${myID}] ORG change: ${update.change.from} -> ${update.change.to} (dORG: ${dORG}) [Source: ${update.source}]`);
                    return {
                        T: IndicatorType.Null, // ORG changes don't show indicators but sync bars
                        id: tick() * 1000,
                        value: dORG,
                        position: UDim2.fromScale(0, 0),
                        atSecond: update.atSecond,
                        onComplete: update.onComplete,
                        barSyncData: {
                            type: 'org',
                            newValue: update.change.to,
                            maxValue: maxORG
                        }
                    }
                }
                break;
            }
            case 'LOC': {
                const dloc = update.change.to - update.change.from;
                warn(`[EntityVisuals:${myID}] LOC change: ${update.change.from} -> ${update.change.to} (dloc: ${dloc}) [Source: ${update.source}, Affected: ${update.affected}]`);

                if (dloc > 0) {
                    warn(`[EntityVisuals:${myID}] Creating RETREAT indicator (dloc > 0) - Entity moving backward`);
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
                    warn(`[EntityVisuals:${myID}] Creating ADVANCE indicator (dloc < 0) - Entity moving forward`);
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

    // Trigger animations and bar syncs based on indicator type
    const triggerAnimation = (animationType: string) => {
        warn(`[EntityVisuals:${myID}] Triggering animation: ${animationType}`);
        switch (animationType) {
            case 'attack':
                warn(`[EntityVisuals:${myID}] Setting isAttacking = true`);
                setIsAttacking(true);
                break;
            case 'retreat':
                warn(`[EntityVisuals:${myID}] Setting isRetreating = true`);
                setIsRetreating(true);
                break;
            case 'advance':
                warn(`[EntityVisuals:${myID}] Setting isRetreating = false (advance)`);
                setIsRetreating(false);
                break;
            case 'die':
                warn(`[EntityVisuals:${myID}] Setting isDying = true`);
                setIsDying(true);
                break;
        }
    };

    // Create circular HP bar segments
    const createCircularBar = () => {
        const segments = [];
        const totalSegments = 8;
        const startAngle = 90;
        const endAngle = 450;
        const anglePerSegment = (endAngle - startAngle) / totalSegments;
        const ringWidth = 0.4 / totalSegments;
        const radius = 0.5;

        for (let i = 0; i < totalSegments; i++) {
            const angle = startAngle + i * anglePerSegment;
            const radians = math.rad(angle);
            const x = math.cos(radians) * radius;
            const y = math.sin(radians) * radius;

            segments.push(
                <frame
                    key={`segment_${i}`}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Position={UDim2.fromScale(0.5 + x, 0.5 - y)}
                    Size={new UDim2(0, ringWidth * 150, 0, ringWidth * 150)}
                    BackgroundColor3={orgRatio.map(ratio => {
                        const filledSegments = math.round(ratio * totalSegments);
                        return i < filledSegments
                            ? new Color3(0, 0.8, 0)
                            : new Color3(0.3, 0.3, 0.3);
                    })}
                    BorderSizePixel={0}
                    ZIndex={1}
                >
                    <uicorner CornerRadius={new UDim(1, 0)} />
                </frame>
            );
        }
        return segments;
    };

    const syncBars = (barSyncData: { type: string, newValue: number, maxValue: number }) => {
        const ratio = barSyncData.newValue / barSyncData.maxValue;
        warn(`[EntityVisuals:${myID}] Syncing ${string.upper(barSyncData.type)} bar: ${barSyncData.newValue}/${barSyncData.maxValue} = ${ratio}`);
        switch (barSyncData.type) {
            case 'hp':
                hpMotion.spring(ratio, springs.slow);
                break;
            case 'org':
                orgMotion.spring(ratio, springs.slow);
                break;
        }
    };

    // Initialize bars to current values
    useEffect(() => {
        hpMotion.set(currentHP / maxHP);
        orgMotion.set(currentORG / maxORG);
    }, []);

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
        warn(`Processing updates: ${updatesKey.sub(1, 100)}...`);


        updates.forEach((update, index) => {
            const r = categoriseUpdate(update);
            if (r) {
                newIndicators.push(r);
            }
        });

        if (newIndicators.size() > 0) {
            const immediateIndicators = newIndicators.filter(ind => ind.atSecond <= 0);
            const timedIndicators = newIndicators.filter(ind => ind.atSecond > 0);

            // Trigger immediate animations and bar syncs
            immediateIndicators.forEach(ind => {
                if (ind.animationTrigger) {
                    triggerAnimation(ind.animationTrigger);
                }
                if (ind.barSyncData) {
                    syncBars(ind.barSyncData);
                }
            });

            if (immediateIndicators.size() > 0) {
                warn(`[EntityVisuals:${myID}] Adding ${immediateIndicators.size()} immediate indicators:`);
                immediateIndicators.forEach(ind => {
                    warn(`[EntityVisuals:${myID}] - ${IndicatorType[ind.T]} (trigger: ${ind.animationTrigger || 'none'})`);
                });
                setIndicators(prev => [...prev, ...immediateIndicators]);
            }

            if (timedIndicators.size() > 0) {
                warn(`[EntityVisuals:${myID}] Queuing ${timedIndicators.size()} timed indicators:`);
                adtRef.current = 0;
                timedIndicators.forEach(ind => {
                    warn(`[EntityVisuals:${myID}] - ${IndicatorType[ind.T]}@${ind.atSecond}s (trigger: ${ind.animationTrigger || 'none'})`);
                });
                setPendingIndicators(timedIndicators);
            }
        }
    }, [updatesKey]);

    // Handle timed indicators with animation and bar sync
    useEffect(() => {
        if (pendingIndicators.size() === 0) return;
        if (runnerRef.current) {
            runnerRef.current.Disconnect();
            runnerRef.current = undefined;
        }

        let currentQueue = [...pendingIndicators];
        currentQueue.sort((a, b) => a.atSecond < b.atSecond);

        const connection = RunService.Heartbeat.Connect((dt) => {
            adtRef.current += dt;

            const indicatorsToShow: ProtoIndicator[] = [];
            while (currentQueue.size() > 0 && adtRef.current >= currentQueue[0].atSecond) {
                const indicatorToShow = currentQueue.shift()!;
                warn(`[EntityVisuals:${myID}] Showing timed indicator: ${IndicatorType[indicatorToShow.T]} at ${adtRef.current}s (scheduled: ${indicatorToShow.atSecond}s)`);
                indicatorsToShow.push(indicatorToShow);

                // Trigger animation when indicator shows (perfect sync)
                if (indicatorToShow.animationTrigger) {
                    triggerAnimation(indicatorToShow.animationTrigger);
                }

                // Sync bars when indicator shows (perfect sync)
                if (indicatorToShow.barSyncData) {
                    syncBars(indicatorToShow.barSyncData);
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
        warn(`[EntityVisuals:${myID}] Retreat animation triggered: isRetreating = ${isRetreating}`);
        const targetScale = isRetreating ? 0 : 1;
        warn(`[EntityVisuals:${myID}] Scaling to: ${targetScale}`);

        scaleMotion.tween(targetScale, {
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
            {/* Circular ORG Bar */}
            {createCircularBar()}

            {/* Linear HP Bar */}
            <frame
                Size={UDim2.fromScale(0.75, 0.025)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.85)}
                BackgroundTransparency={.8}
                BackgroundColor3={BrickColor.DarkGray().Color}
            >
                <uistroke Thickness={.75} Color={Color3.fromRGB(255, 255, 255)} />
                <uicorner CornerRadius={new UDim(0.5, 0)} />
                <frame
                    Size={hpRatio.map(v => UDim2.fromScale(v, 1))}
                    BackgroundColor3={CONDOR_BLOOD_RED}
                >
                    <uistroke Thickness={1} Color={CONDOR_BLOOD_RED} />
                    <uicorner CornerRadius={new UDim(0.5, 0)} />
                </frame>
            </frame>

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
                            warn(`[EntityVisuals:${myID}] Rendering ADVANCE indicator ➡️ at ${indicator.atSecond}s`);
                            return (
                                <ClashFateEffect
                                    key={indicator.id}
                                    fate={"➡️"}
                                    position={indicator.position}
                                    onComplete={() => {
                                        warn(`[EntityVisuals:${myID}] ADVANCE indicator completed`);
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

export = EntityVisuals;