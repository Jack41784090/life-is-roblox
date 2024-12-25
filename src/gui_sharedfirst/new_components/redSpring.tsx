import React from "@rbxts/react";
import { CONDOR_BLOOD_RED } from "shared/const";

interface Props {
    charge: React.Binding<number>;
}

export function RedSpring(props: Props) {
    return (
        <frame
            AnchorPoint={new Vector2(0, 1)}
            Size={props.charge.map(v => UDim2.fromScale(v, 0.05))}
            BackgroundTransparency={0}
            Position={UDim2.fromScale(0, 1)}
            BackgroundColor3={CONDOR_BLOOD_RED}>
            <uistroke Thickness={0} />
        </frame>
    )
}