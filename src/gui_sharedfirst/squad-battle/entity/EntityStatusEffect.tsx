import React from "@rbxts/react";
import { iSkillEffect } from "squad-battle/Battle/System/type";

function EntityStatusEffect({ ise, myID }: { ise: iSkillEffect, myID: number }) {
    return <>
        <textlabel
            key={`${myID}-status-${ise.effect.type}-${ise.duration}`}
            Text={ise.icon ?? "😀"}
            TextScaled={true}
            BorderSizePixel={0}
            BackgroundTransparency={1}
        >
            <textlabel
                Text={`${ise.duration}`}
                Size={UDim2.fromScale(0.4, 0.4)}
                Position={UDim2.fromScale(1, 0)}
                AnchorPoint={new Vector2(1, 0)}
                BackgroundTransparency={1}
                TextColor3={Color3.fromRGB(255, 255, 255)}
            >
                <uistroke
                    Color={Color3.fromRGB(0, 0, 0)}
                    Thickness={3}
                />
            </textlabel>
        </textlabel>
    </>
}

export = EntityStatusEffect;