import React from "@rbxts/react";
import { EntityBaseStats, EntityChangeableStats } from "squad-battle/type";
import PlayerPortrait from "./PlayerPortrait";

interface EntityDisplayProps {
    name: string;
    playerID: number;
    team: string;
    baseStats: EntityBaseStats;
    changeableStats: EntityChangeableStats;
    // position?: UDim2;
}

function EntityDisplay(props: EntityDisplayProps) {
    return (
        <frame
            Position={new UDim2(0, 0, 0, 0)}
            Size={new UDim2(.25, 0, .8, 0)}
            BackgroundColor3={new Color3(0.2, 0.2, 0.2)}
            BackgroundTransparency={0}
        // BorderColor3={new Color3(0, 0, 0)}
        // BorderSizePixel={1}
        >
            {/* <uiaspectratioconstraint AspectRatio={1} />
            <uicorner CornerRadius={new UDim(1)} /> */}
            <PlayerPortrait
                // entityId={"props.playerID"}
                entityId="entity_adalbrecht"
                hp={props.changeableStats.HP}
                maxHP={props.changeableStats.HP()}
            />

            {/* <EntityInfo
                name={props.name}
                playerID={props.playerID}
                changeableStats={props.changeableStats}
            /> */}

            {/* <EntityStats changeableStats={props.changeableStats} /> */}
        </frame>
    );
}

export = EntityDisplay;