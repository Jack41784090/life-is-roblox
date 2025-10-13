import React, { Binding } from "@rbxts/react";
import { iSkillEffect } from "squad-battle/Battle/System/type";
import EntityStatusEffect from "./EntityStatusEffect";

interface EntityPortraitProps {
    scale: Binding<number>;
    rotation: Binding<number>;
    isDying: boolean;
    upsideDown: boolean;
    portraitImage: string;
    statusEffects: iSkillEffect[];
    myID: number;
}

function EntityPortrait({
    scale,
    rotation,
    isDying,
    upsideDown,
    portraitImage,
    statusEffects,
    myID
}: EntityPortraitProps) {
    return (
        <frame
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={scale.map((s: number) => UDim2.fromScale(0.5, upsideDown ?
                .5 - .5 * (1 - s) :
                .5 + .5 * (1 - s)))}
            Size={scale.map((s: number) => UDim2.fromScale(0.8 * s, 0.8 * s))}
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
                {statusEffects.map((ise) => <EntityStatusEffect
                    key={`${myID}-status-${ise.effect.type}-${ise.duration}`}
                    ise={ise} myID={myID} />)}
            </frame>
        </frame>
    );
}

export = EntityPortrait;
