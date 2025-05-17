import React from "@rbxts/react";
import EffectsEventBus from "shared/class/battle/Client/Effects";
import AbilityReactionEffect from "./AbilityReactionEffect";
import AbilityUseEffect from "./AbilityUseEffect";
import DamageIndicator from "./DamageIndicator";
import HitImpactEffect from "./HitImpactEffect";
import StyleSwitchEffect from "./StyleSwitchEffect";
import {
    AbilityReactionEventData,
    AbilityUseEventData,
    DamageEventData,
    Effect,
    EffectType,
    HitImpactEventData,
    StyleSwitchEventData
} from "../../../shared/class/battle/Client/Effects/types";

interface EffectsManagerProps {
    maxEffects?: number;
}

export default function EffectsManager({ maxEffects = 10 }: EffectsManagerProps) {
    const [effects, setEffects] = React.useState<Effect[]>([]);

    const addEffect = (effectType: EffectType, effectData: Partial<Effect>) => {
        const newEffect: Effect = {
            id: tostring(game.GetService("HttpService").GenerateGUID(false)),
            type: effectType,
            position: effectData.position!,
            color: effectData.color,
            damage: effectData.damage,
            abilityName: effectData.abilityName,
            impactSize: effectData.impactSize,
            createdAt: tick()
        };

        setEffects(prevEffects => {
            if (prevEffects.size() >= maxEffects) {
                const newEffects: Effect[] = [];
                for (let i = 1; i < prevEffects.size(); i++) {
                    newEffects.push(prevEffects[i]);
                }
                newEffects.push(newEffect);
                return newEffects;
            }
            return [...prevEffects, newEffect];
        });

        return newEffect.id;
    };

    const removeEffect = (id: string) => {
        setEffects(prevEffects => prevEffects.filter(e => e.id !== id));
    };

    React.useEffect(() => {
        // Use the singleton instance of EffectsEventBus
        const eventBus = EffectsEventBus.getInstance();
        const connections = new Array<() => void>();
        
        print("EffectsManager: Setting up event subscriptions");

        connections.push(
            eventBus.subscribe(EffectType.Damage, (data: unknown) => {
                print("EffectsManager: Received Damage event", data);
                const eventData = data as DamageEventData;
                addEffect(EffectType.Damage, {
                    position: eventData.position,
                    damage: eventData.damage
                });
            })
        );

        connections.push(
            eventBus.subscribe(EffectType.StyleSwitch, (data: unknown) => {
                const eventData = data as StyleSwitchEventData;
                addEffect(EffectType.StyleSwitch, {
                    position: eventData.position,
                    color: eventData.color
                });
            })
        );

        connections.push(
            eventBus.subscribe(EffectType.AbilityReaction, (data: unknown) => {
                const eventData = data as AbilityReactionEventData;
                addEffect(EffectType.AbilityReaction, {
                    position: eventData.position,
                    color: eventData.color,
                    abilityName: eventData.abilityName
                });
            })
        );

        connections.push(
            eventBus.subscribe(EffectType.HitImpact, (data: unknown) => {
                const eventData = data as HitImpactEventData;
                addEffect(EffectType.HitImpact, {
                    position: eventData.position,
                    color: eventData.color,
                    impactSize: eventData.impactSize
                });
            })
        );

        connections.push(
            eventBus.subscribe(EffectType.AbilityUse, (data: unknown) => {
                const eventData = data as AbilityUseEventData;
                addEffect(EffectType.AbilityUse, {
                    position: eventData.position,
                    color: eventData.color,
                    abilityName: eventData.abilityName
                });
            })
        );

        return () => {
            connections.forEach(connection => connection());
        };
    }, []);

    const renderEffect = (effect: Effect) => {
        switch (effect.type) {
            case EffectType.Damage:
                return (
                    <DamageIndicator
                        key={effect.id}
                        damage={effect.damage!}
                        position={effect.position}
                        onComplete={() => removeEffect(effect.id)}
                    />
                );
            case EffectType.StyleSwitch:
                return (
                    <StyleSwitchEffect
                        key={effect.id}
                        position={effect.position}
                        color={effect.color!}
                        onComplete={() => removeEffect(effect.id)}
                    />
                );
            case EffectType.AbilityReaction:
                return (
                    <AbilityReactionEffect
                        key={effect.id}
                        position={effect.position}
                        color={effect.color!}
                        abilityName={effect.abilityName!}
                        onComplete={() => removeEffect(effect.id)}
                    />
                );
            case EffectType.HitImpact:
                return (
                    <HitImpactEffect
                        key={effect.id}
                        position={effect.position}
                        color={effect.color!}
                        impactSize={effect.impactSize!}
                        onComplete={() => removeEffect(effect.id)}
                    />
                );
            case EffectType.AbilityUse:
                return (
                    <AbilityUseEffect
                        key={effect.id}
                        position={effect.position}
                        color={effect.color!}
                        abilityName={effect.abilityName!}
                        onComplete={() => removeEffect(effect.id)}
                    />
                );
            default:
                return undefined;
        }
    };

    return (
        <frame
            Size={new UDim2(1, 0, 1, 0)}
            BackgroundTransparency={1}
            ZIndex={10}
        >
            {effects.map(renderEffect)}
        </frame>
    );
}
