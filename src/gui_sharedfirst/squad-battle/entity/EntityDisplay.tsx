// filepath: c:\Users\tszmi\Documents\Code\roblox-game\src\gui_sharedfirst\new_components\battle\statusBar\playerPortrait\index.tsx
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect } from "@rbxts/react";
import Bar from "gui_sharedfirst/new_components/loading/components/bar";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { findEntityPortrait, springs } from "shared/utils";
import { EntityDisplayProps } from "../type";
import EntityCircleBar from "./EntityCircleBar";
import EntityPortraitWithIndicators from "./EntityPortraitWithIndicators";

/**
 * Circular player portrait with HP bar surrounding it.
 * The HP bar is a circular arc that surrounds 25% of the portrait in the top-right quadrant when full.
 */
function EntityDisplay(props: EntityDisplayProps) {
    const { entity } = props;
    const [hpRatio, hpMotion] = useMotion(1);
    const [orgRatio, orgMotion] = useMotion(1);

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
                TextColor3={new Color3(1, 1, 1)}
                TextScaled={true}
            />
            <EntityCircleBar hpRatio={orgRatio} />
            <Bar progress={hpRatio} />
            <EntityPortraitWithIndicators
                portraitImage={portraitImage}
                upsideDown={props.upsideDown}
                updates={props.entityUpdates ?? []}
                myID={props.entity.playerID}
            />
        </frame>
    );
}

export = EntityDisplay;