import React from "@rbxts/react";
import { getTestButtons } from "shared/utils";
import MainMenuBackground from "./components/background";
import MainMenuButtonSet from "./components/button_set";
import MainMenuTitle from "./components/title";

interface MenuFrameElementProps {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    screenUIKey?: string;
    frameKey?: string;
    title: string;
}

interface MenuFrameElementState {
    colour: Color3;
}

function MainMenuElement({ frameKey, backgroundColour, transparency, zIndex, title }: MenuFrameElementProps) {
    const buttons = getTestButtons()

    return (
        <MainMenuBackground frameKey={frameKey} backgroundColour={backgroundColour} transparency={transparency} zIndex={zIndex}>
            <MainMenuTitle title={title} />
            <MainMenuButtonSet buttons={buttons} />
        </MainMenuBackground>
    );
}

export = MainMenuElement