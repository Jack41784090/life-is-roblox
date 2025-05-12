import { Atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import ReadinessIconElement from "./icon_element";

interface Props {
    icons: Atom<ReadinessFragment>[]; // Array of image URLs or asset IDs for character icons
}

function ReadinessBar(props: Props) {
    // print(`Readiness Bar props`, props)
    return (
        <frame
            key={"ReadinessBar"}
            Position={new UDim2(0.05, 0, 0.02, 0)} // Changed from 0.1 to 0.02 to move to top
            Size={new UDim2(0.9, 0, 0.06, 0)} // Made wider and slightly taller
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
