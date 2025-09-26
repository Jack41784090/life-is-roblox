// filepath: c:\Users\tszmi\Documents\Code\roblox-game\src\gui_sharedfirst\new_components\battle\statusBar\playerPortrait\index.tsx
import { useMotion, useViewport } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useState } from "@rbxts/react";
import ClashFateEffect from "gui_sharedfirst/new_components/effects/ClashFateEffect";
import Bar from "gui_sharedfirst/new_components/loading/components/bar";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { findEntityPortrait, springs } from "shared/utils";
import { SquadEntity } from "squad-battle/Entity";
import { EntityUpdate } from "squad-battle/type";
import DamageIndicator from "../../new_components/effects/DamageIndicator";
import EntityCircleBar from "./EntityCircleBar";

enum IndicatorType {
    Damage,
    Heal,
    Retreat,
    Death,
}

interface ProtoIndicator {
    T: IndicatorType;
    id: number;
    value: number;
    position: UDim2;
}

interface Props {
    entity: SquadEntity;
    entityUpdates?: EntityUpdate[];
}

/**
 * Circular player portrait with HP bar surrounding it.
 * The HP bar is a circular arc that surrounds 25% of the portrait in the top-right quadrant when full.
 */
function PlayerPortrait(props: Props) {
    const { entity } = props;
    const viewport = useViewport();
    const [hpRatio, hpMotion] = useMotion(1);
    const [orgRatio, orgMotion] = useMotion(1);
    const hp = props.entity.changeableStats.HP();
    const org = entity.changeableStats.ORG();
    const maxHP = props.entity.calculateRealityValue(Reality.HP);
    const maxORG = entity.calculateRealityValue(Reality.Guts);
    const [damageIndicators, setIndicators] = useState<Array<ProtoIndicator>>([]);

    useEffect(() => {
        hpMotion.spring(hp / maxHP, springs.slow);
    }, [hp]);

    useEffect(() => {
        orgMotion.spring(org / maxORG, springs.slow);
    }, [org]);

    // Process entity updates to create damage indicators
    useEffect(() => {
        if (!props.entityUpdates || props.entityUpdates.size() === 0) return;

        const newIndicators: Array<ProtoIndicator> = [];
        props.entityUpdates.forEach((update, index) => {
            switch (update.change.property) {
                case 'DIE':
                case 'LEAVE': {
                    newIndicators.push({
                        T: update.change.property === 'DIE' ? IndicatorType.Death : IndicatorType.Retreat,
                        id: tick() * 1000 + index,
                        value: 0,
                        position: UDim2.fromScale(.5, .5)
                    });
                    break;
                }
                case "HP": {
                    const dHP = update.change.to - update.change.from;
                    const randomX = 0.3 + math.random() * 0.4; // Between 0.3 and 0.7
                    const randomY = 0.2 + math.random() * 0.6; // Between 0.2 and 0.8
                    newIndicators.push({
                        T: dHP > 0 ? IndicatorType.Heal : IndicatorType.Damage,
                        id: tick() * 1000 + index,
                        value: dHP,
                        position: UDim2.fromScale(randomX, randomY)
                    });
                    break;
                }

                case 'LOC': {
                    const dloc = update.change.to - update.change.from;
                    if (dloc > 0) { // Retreating
                        newIndicators.push({
                            T: IndicatorType.Retreat,
                            id: tick() * 1000 + index,
                            value: dloc,
                            position: UDim2.fromScale(.5, .5)
                        });
                    }
                }
            }
        });

        if (newIndicators.size() > 0) {
            setIndicators(prev => [...prev, ...newIndicators]);
        }
    }, [props.entityUpdates]);

    const removeIndicator = (id: number) => {
        setIndicators(prev => prev.filter(indicator => indicator.id !== id));
    };

    // Find portrait using utility function
    const portraitImage = findEntityPortrait(props.entity.stats.id, 'neutral');

    const circleSize = 0.25; // Size of the circle (25% of the screen size)
    return (
        <frame
            key={"PlayerPortrait-" + props.entity.stats.id}
            Size={UDim2.fromScale(.8, .8)}
            // Size={UDim2.fromScale(1, 1)}
            BackgroundTransparency={1}
            SizeConstraint={
                viewport.getValue().Y < viewport.getValue().X
                    ? Enum.SizeConstraint.RelativeYY
                    : Enum.SizeConstraint.RelativeXX
            }
        >
            <EntityCircleBar hpRatio={orgRatio} />
            <Bar progress={hpRatio} />


            {/* Background circle */}
            <frame
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                Size={UDim2.fromScale(0.9, 0.9)}
                BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
                BackgroundTransparency={0}
                ZIndex={0} // Above the HP bar
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
                {/* Player Portrait */}
                <imagelabel
                    Image={portraitImage}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    Position={UDim2.fromScale(0.5, 0.5)}
                    Size={UDim2.fromScale(0.85, 0.85)}
                    BackgroundTransparency={1}
                    ZIndex={0} // Above the background
                    ScaleType={Enum.ScaleType.Crop}
                >
                    <uicorner CornerRadius={new UDim(1, 0)} />
                </imagelabel>
            </frame>


            {/* Damage Indicators */}
            {damageIndicators.map((indicator) => {
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
    );
}

export = PlayerPortrait;