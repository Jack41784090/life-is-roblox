import React from "@rbxts/react";
import { ReadinessIcon } from "shared/types/battle-types";
import ReadinessIconElement from "./icon_element";

interface Props {
    icons: ReadinessIcon[]; // Array of image URLs or asset IDs for character icons
}

function ReadinessBar(props: Props) {
    print(`Readiness Bar props`, props)
    return (
        <frame
            key={"ReadinessBar"}
            Position={new UDim2(0.05, 0, 0.1, 0)}
            Size={new UDim2(0.005, 0, 0.8, 0)}
            BackgroundTransparency={0.25}
            BackgroundColor3={new Color3(1, 0.03, 0.03)}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={2}
        >
            {props.icons.map((icon, index) => <ReadinessIconElement {... { icon, index }} />)}
        </frame>
    );
}

export = ReadinessBar;
