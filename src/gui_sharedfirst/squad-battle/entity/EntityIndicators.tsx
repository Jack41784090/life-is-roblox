import React from "@rbxts/react";
import { AbilityUseEffect, DamageIndicator } from "gui_sharedfirst/new_components/effects";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import { IndicatorType, ProtoIndicator } from "./types";

interface EntityIndicatorsProps {
    indicators: Array<ProtoIndicator>;
    removeIndicator: (id: number) => void;
    myID: number;
    enableDebugWarns?: boolean;
}

function EntityIndicators({ indicators, removeIndicator, myID, enableDebugWarns }: EntityIndicatorsProps) {
    return (
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
                        if (enableDebugWarns) warn(`[EntityVisuals:${myID}] Rendering ADVANCE indicator ➡️ at ${indicator.atSecond}s`);
                        return (
                            <ClashFateEffect
                                key={indicator.id}
                                fate={"➡️"}
                                position={indicator.position}
                                onComplete={() => {
                                    if (enableDebugWarns) warn(`[EntityVisuals:${myID}] ADVANCE indicator completed`);
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
    );
}

export = EntityIndicators;
