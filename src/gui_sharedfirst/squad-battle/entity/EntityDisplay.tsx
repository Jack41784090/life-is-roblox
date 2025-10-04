// filepath: c:\Users\tszmi\Documents\Code\roblox-game\src\gui_sharedfirst\new_components\battle\statusBar\playerPortrait\index.tsx
import React from "@rbxts/react";
import { findEntityPortrait } from "shared/utils";
import { EntityDisplayProps } from "../type";
import EntityVisuals from "./EntityVisuals";

/**
 * Circular player portrait with HP bar surrounding it.
 * The HP bar is a circular arc that surrounds 25% of the portrait in the top-right quadrant when full.
 */
function EntityDisplay(props: EntityDisplayProps) {
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
            <EntityVisuals
                portraitImage={portraitImage}
                upsideDown={props.upsideDown}
                updates={props.entityUpdates ?? []}
                myID={props.entity.playerID}
                entity={props.entity}
            />
        </frame>
    );
}

export = EntityDisplay;