import React, { Binding } from "@rbxts/react";
import { CONDOR_BLOOD_RED } from "shared/const";

interface LinearHpBarProps {
    hpRatio: Binding<number>;
}

function LinearHpBar({ hpRatio }: LinearHpBarProps) {
    return (
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
                Size={hpRatio.map((v: number) => UDim2.fromScale(v, 1))}
                BackgroundColor3={CONDOR_BLOOD_RED}
            >
                <uistroke Thickness={1} Color={CONDOR_BLOOD_RED} />
                <uicorner CornerRadius={new UDim(0.5, 0)} />
            </frame>
        </frame>
    );
}

export = LinearHpBar;
