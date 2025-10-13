import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useMemo, useRef, useState } from "@rbxts/react";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { springs } from "shared/utils";
import { SquadEntity } from "squad-battle/Entity";
import { DebugProps, EntityPortraitProps } from "../type";
import CircularOrgBar from "./CircularOrgBar";
import EntityIndicators from "./EntityIndicators";
import EntityPortrait from "./EntityPortrait";
import LinearHpBar from "./LinearHpBar";
import { EntityUpdateIndicator, IndicatorType, ProtoIndicator } from "./types";

interface EntityVisualsProps extends Omit<EntityPortraitProps, 'isAttacking' | 'isRetreating' | 'isDying'>, DebugProps {
    updates: EntityUpdateIndicator[];
    myID: number;
    entity: SquadEntity;
    getTimer: () => number;
}

function EntityVisuals({
    portraitImage,
    upsideDown = false,
    updates,
    myID,
    entity,
    getTimer,
    enableDebugWarns
}: EntityVisualsProps) {
    if (enableDebugWarns) warn(`| | | | | Entity Visual:${entity.playerID}: rendered`)
    const [isAttacking, setIsAttacking] = useState(false);
    const [isRetreating, setIsRetreating] = useState(false);
    const [isDying, setIsDying] = useState(false);
    const [rotation, rotationMotion] = useMotion(0);
    const [scale, scaleMotion] = useMotion(1);
    const [hpRatio, hpMotion] = useMotion(1);
    const [orgRatio, orgMotion] = useMotion(1);
    const animationCleanupRef = useRef<thread | undefined>();
    const isAnimatingRef = useRef(false);
    const [indicators, setIndicators] = useState<Array<ProtoIndicator>>([]);
    const [pendingIndicators, setPendingIndicators] = useState<Array<ProtoIndicator>>([]);
    const processedUpdatesRef = useRef<Set<string>>(new Set());
    const currentHP = entity.changeableStats.HP();
    const currentORG = entity.changeableStats.ORG();
    const maxHP = entity.calculateRealityValue(Reality.HP);
    const maxORG = entity.calculateRealityValue(Reality.Guts);

    const categoriseUpdate = (update: EntityUpdateIndicator): ProtoIndicator | undefined => {
        if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Processing update: ${update.change.property} from ${update.source} to ${update.affected} at ${update.atSecond}s`);

        const result: ProtoIndicator = {
            ref: update,
            T: IndicatorType.Null,
            id: tick() * 1000,
            value: 0,
            position: UDim2.fromScale(.5, .5),
            atSecond: update.atSecond,
            onComplete: update.onComplete,
            animationTrigger: 'none'
        };
        switch (update.change.property) {
            case 'CLINK': {
                if (update.affected === myID) {
                    result.T = IndicatorType.Clink;
                }
                else if (update.source === myID) {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Attack trigger: Damaging entity ${update.affected} (HP: ${update.change.from} -> ${update.change.to}) at ${update.atSecond}s`);
                    result.T = IndicatorType.Null;
                    result.value = -1;
                    result.position = UDim2.fromScale(0, 0);
                    result.animationTrigger = 'attack';
                }
                break;
            }
            case 'DODGE': {
                if (update.affected === myID) {
                    result.T = IndicatorType.Dodge;
                }
                else if (update.source === myID) {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Attack trigger: Damaging entity ${update.affected} (HP: ${update.change.from} -> ${update.change.to}) at ${update.atSecond}s`);
                    result.T = IndicatorType.Null;
                    result.value = -1;
                    result.position = UDim2.fromScale(0, 0);
                    result.animationTrigger = 'attack';
                }
                break;
            }
            case 'DIE':
            case 'RETREAT':
            case 'LEAVE': {
                result.T = update.change.property === 'DIE' ? IndicatorType.Death : IndicatorType.Retreat;
                result.animationTrigger = update.change.property === 'DIE' ? 'die' : 'retreat';
                break;
            }
            case "HP": {
                if (update.affected === myID) {
                    const dHP = update.change.to - update.change.from;
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] HP change: ${update.change.from} -> ${update.change.to} (dHP: ${dHP}) [Source: ${update.source}]`);
                    const randomX = 0.3 + math.random() * 0.4;
                    const randomY = 0.2 + math.random() * 0.6;
                    result.T = dHP > 0 ? IndicatorType.Heal : IndicatorType.Damage;
                    result.value = dHP;
                    result.position = UDim2.fromScale(randomX, randomY);
                    result.barSyncData = {
                        type: 'hp',
                        newValue: update.change.to,
                        maxValue: maxHP
                    };
                }
                else if (update.source === myID) {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Attack trigger: Damaging entity ${update.affected} (HP: ${update.change.from} -> ${update.change.to}) at ${update.atSecond}s`);
                    result.T = IndicatorType.Null;
                    result.value = -1;
                    result.position = UDim2.fromScale(0, 0);
                    result.animationTrigger = 'attack';
                }
                break;
            }
            case 'ORG': {
                if (update.affected === myID) {
                    const dORG = update.change.to - update.change.from;
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] ORG change: ${update.change.from} -> ${update.change.to} (dORG: ${dORG}) [Source: ${update.source}]`);
                    result.T = IndicatorType.Null; // ORG changes don't show indicators but sync bars
                    result.value = dORG;
                    result.position = UDim2.fromScale(0, 0);
                    result.barSyncData = {
                        type: 'org',
                        newValue: update.change.to,
                        maxValue: maxORG
                    };
                }
                break;
            }
            case 'LOC': {
                const dloc = update.change.to - update.change.from;
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] LOC change: ${update.change.from} -> ${update.change.to} (dloc: ${dloc}) [Source: ${update.source}, Affected: ${update.affected}]`);

                if (dloc > 0) {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Creating RETREAT indicator (dloc > 0) - Entity moving backward`);
                    result.T = IndicatorType.Retreat;
                    result.value = dloc;
                    result.position = UDim2.fromScale(.5, .5);
                    result.animationTrigger = 'retreat';
                }
                else {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Creating ADVANCE indicator (dloc < 0) - Entity moving forward`);
                    result.T = IndicatorType.Advance;
                    result.value = dloc;
                    result.position = UDim2.fromScale(.5, .5);
                    result.animationTrigger = 'advance';
                }
                break;
            }
        }
        return result;
    }

    const removeIndicator = (id: number) => {
        setIndicators(prev => prev.filter(indicator => indicator.id !== id));
    };

    const triggerPortraitAnimation = (animationType: string) => {
        if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Triggering animation: ${animationType}`);
        switch (animationType) {
            case 'attack':
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Setting isAttacking = true`);
                setIsAttacking(true);
                break;
            case 'retreat':
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Setting isRetreating = true`);
                setIsRetreating(true);
                break;
            case 'advance':
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Setting isRetreating = false (advance)`);
                setIsRetreating(false);
                break;
            case 'die':
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Setting isDying = true`);
                setIsDying(true);
                break;
        }
    };

    const syncBars = (barSyncData: { type: string, newValue: number, maxValue: number }) => {
        const ratio = barSyncData.newValue / barSyncData.maxValue;
        if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Syncing ${string.upper(barSyncData.type)} bar: ${barSyncData.newValue}/${barSyncData.maxValue} = ${ratio}`);
        switch (barSyncData.type) {
            case 'hp':
                hpMotion.spring(ratio, springs.slow);
                break;
            case 'org':
                orgMotion.spring(ratio, springs.slow);
                break;
        }
    };
    useEffect(() => {
        if (enableDebugWarns) warn(`| | | | | Entity Visual:${entity.playerID}: mounting`)
        hpMotion.set(currentHP / maxHP);
        orgMotion.set(currentORG / maxORG);
        return () => {
            if (enableDebugWarns) warn(`| | | | | Entity Visual:${entity.playerID}: unmounting`)
        }
    }, []);
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
    useEffect(() => {
        if (!updates || updates.size() === 0 || !updatesKey) return;

        if (processedUpdatesRef.current.has(updatesKey)) {
            if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Updates already processed: ${updatesKey}... Skipping.`);
            return;
        }
        processedUpdatesRef.current.add(updatesKey);
        if (processedUpdatesRef.current.size() > 100) {
            processedUpdatesRef.current.clear();
        }

        const newIndicators: Array<ProtoIndicator> = [];
        if (enableDebugWarns) warn(`Processing updates: ${updatesKey}...`);

        updates.forEach((update, index) => {
            const r = categoriseUpdate(update);
            if (r) {
                newIndicators.push(r);
            }
        });

        if (newIndicators.size() > 0) {
            const immediateIndicators = newIndicators.filter(ind => ind.atSecond <= getTimer());
            const timedIndicators = newIndicators.filter(ind => ind.atSecond > getTimer());

            // Trigger immediate animations and bar syncs
            immediateIndicators.forEach(ind => {
                ind.ref.done = true;
                if (ind.animationTrigger) {
                    triggerPortraitAnimation(ind.animationTrigger);
                }
                if (ind.barSyncData) {
                    syncBars(ind.barSyncData);
                }
            });

            if (immediateIndicators.size() > 0) {
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Adding ${immediateIndicators.size()} immediate indicators:`);
                immediateIndicators.forEach(ind => {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] - ${IndicatorType[ind.T]} (trigger: ${ind.animationTrigger || 'none'})`);
                });
                setIndicators(prev => [...prev, ...immediateIndicators]);
            }

            if (timedIndicators.size() > 0) {
                if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Queuing ${timedIndicators.size()} timed indicators:`);
                timedIndicators.forEach(ind => {
                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] - ${IndicatorType[ind.T]}@${ind.atSecond}s (trigger: ${ind.animationTrigger || 'none'})`);
                });
                setPendingIndicators(timedIndicators);
            }
        }
    }, [updatesKey]);
    useEffect(() => {
        if (pendingIndicators.size() === 0) return;
        if (pendingIndicators[0].atSecond > getTimer()) {
            task.spawn(() => {
                task.wait(pendingIndicators[0].atSecond - getTimer());
                setPendingIndicators(prev => [...prev]); // Trigger re-evaluation
            })
            return;
        }

        let currentQueue = [...pendingIndicators];
        currentQueue.sort((a, b) => a.atSecond < b.atSecond);

        const indicatorsToShow: Array<ProtoIndicator> = [];
        while (currentQueue.size() > 0 && getTimer() >= currentQueue[0].atSecond) {
            const indicatorToShow = currentQueue.shift()!;
            indicatorToShow.ref.done = true;
            if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Showing timed indicator: ${IndicatorType[indicatorToShow.T]} at ${getTimer()}s (scheduled: ${indicatorToShow.atSecond}s)`);
            indicatorsToShow.push(indicatorToShow);

            if (indicatorToShow.animationTrigger) {
                triggerPortraitAnimation(indicatorToShow.animationTrigger);
            }
            if (indicatorToShow.barSyncData) {
                syncBars(indicatorToShow.barSyncData);
            }
        }

        if (indicatorsToShow.size() > 0) {
            setIndicators(prev => [...prev, ...indicatorsToShow]);
        }
        if (currentQueue.size() > 0) {
            setPendingIndicators(currentQueue);
        }
    }, [pendingIndicators]);
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
    useEffect(() => {
        return () => {
            if (animationCleanupRef.current) {
                task.cancel(animationCleanupRef.current);
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


                <frame
                    Size={UDim2.fromScale(.75, .8)}
                    Position={UDim2.fromScale(0.1, .5)}
                    AnchorPoint={new Vector2(0, .5)}
                    BackgroundTransparency={1}
                >
                    <uigridlayout
                        FillDirection={'Vertical'}
                        CellSize={UDim2.fromScale(.333, .2)}
                        CellPadding={UDim2.fromOffset(0, 0)}
                        HorizontalAlignment={'Left'}
                        VerticalAlignment={'Top'}
                    />
                    {entity.statusEffects.map((ise) => <EntityStatusEffect
                        key={`${myID}-status-${ise.effect.type}-${ise.duration}`}
                        ise={ise} myID={myID} />)}
                </frame>
            </frame>

            {/* Indicators Frame */}
            <frame BackgroundTransparency={1} Size={UDim2.fromScale(1, 1)}>
                {indicators.map((indicator) => {
                    switch (indicator.T) {
                        case IndicatorType.Clink:
                        case IndicatorType.Dodge:
                            return (
                                <AbilityUseEffect
                                    key={indicator.id}
                                    color={indicator.T === IndicatorType.Clink ? new Color3(0.8, 0.8, 0.2) : new Color3(0.2, 0.6, 1)}
                                    abilityName={indicator.T === IndicatorType.Clink ? "CLINK" : "DODGE"}
                                    position={indicator.position}
                                    onComplete={() => {
                                        removeIndicator(indicator.id);
                                        if (indicator.onComplete) {
                                            indicator.onComplete();
                                        }
                                    }}
                                />
                            );


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