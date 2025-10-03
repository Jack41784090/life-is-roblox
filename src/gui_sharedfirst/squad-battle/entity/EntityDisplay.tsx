// filepath: c:\Users\tszmi\Documents\Code\roblox-game\src\gui_sharedfirst\new_components\battle\statusBar\playerPortrait\index.tsx
import { useMotion, useViewport } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useState } from "@rbxts/react";
import Bar from "gui_sharedfirst/new_components/loading/components/bar";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { findEntityPortrait, springs } from "shared/utils";
import { EntityDisplayProps } from "../type";
import EntityCircleBar from "./EntityCircleBar";
import EntityIndicators from "./EntityIndicators";
import EntityPortrait from "./EntityPortrait";

/**
 * Circular player portrait with HP bar surrounding it.
 * The HP bar is a circular arc that surrounds 25% of the portrait in the top-right quadrant when full.
 */
function PlayerPortrait(props: EntityDisplayProps) {
    warn(` | | | | EntityDisplay ${math.random() * 100 / 100}`);

    const { entity } = props;
    const viewport = useViewport();
    const [hpRatio, hpMotion] = useMotion(1);
    const [orgRatio, orgMotion] = useMotion(1);
    const [isRetreating, setIsRetreating] = useState(false);
    const [isDying, setIsDying] = useState(false);
    const hp = props.entity.changeableStats.HP();
    const org = entity.changeableStats.ORG();
    const maxHP = props.entity.calculateRealityValue(Reality.HP);
    const maxORG = entity.calculateRealityValue(Reality.Guts);

    useEffect(() => {
        hpMotion.spring(hp / maxHP, springs.slow);
    }, [hp]);

    useEffect(() => {
        orgMotion.spring(org / maxORG, springs.slow);
    }, [org]);

    // Process entity updates to create damage indicators
    useEffect(() => {
        if (!props.entityUpdates || props.entityUpdates.size() === 0) return;
        props.entityUpdates.forEach((update, index) => {
            switch (update.change.property) {
                case 'DIE':
                case 'RETREAT':
                case 'LEAVE': {
                    if (update.change.property === 'DIE') {
                        setIsDying(true);
                    }
                    else if (update.change.property === 'LEAVE') {
                        setIsRetreating(true);
                    }
                    break;
                }

                case 'LOC': {
                    const dloc = update.change.to - update.change.from;
                    // props.transferFunction(props.entity, update.change.to as SquadEntityInSquadLocation);
                    if (dloc > 0) {
                        setIsRetreating(true);
                    }
                    else {
                        setIsRetreating(false);
                    }
                }
            }
        });
    }, [props.entityUpdates]);

    // Find portrait using utility function
    const portraitImage = findEntityPortrait(props.entity.stats.id, 'neutral');
    return (
        <frame
            key={"PlayerPortrait-" + props.entity.stats.id}
            Size={UDim2.fromScale(.8, .8)}
            BackgroundTransparency={1}
        >
            <uiaspectratioconstraint AspectRatio={1} />
            <textlabel
                Size={UDim2.fromScale(1, 0.2)}
                Text={props.entity.name}
                BackgroundTransparency={1}
                TextColor3={isDying ? new Color3(1, 0, 0) : new Color3(1, 1, 1)}
                TextScaled={true}
            />
            {
                isDying || isRetreating ?
                    <></> : (
                        <>
                            <EntityCircleBar hpRatio={orgRatio} />
                            <Bar progress={hpRatio} />
                        </>
                    )
            }
            <EntityPortrait portraitImage={portraitImage} isDying={isDying} isRetreating={isRetreating} upsideDown={props.upsideDown} />
            <EntityIndicators updates={props.entityUpdates ?? []} />
        </frame>
    );
}

export = PlayerPortrait;