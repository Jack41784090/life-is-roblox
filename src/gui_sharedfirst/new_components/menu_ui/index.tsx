import React from "@rbxts/react";
import MainMenuBackground from "./components/background";
import { Props as ButtonProps } from "./components/button";
import MainMenuButtonSet from "./components/button_set";
import MainMenuTitle from "./components/title";

interface Props {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    screenUIKey?: string;
    frameKey?: string;
    title: string;
    buttons: Array<ButtonProps>;
}

function MainMenuElement(props: Props) {
    const { title, buttons } = props;
    return (
        <MainMenuBackground {...props}>
            <MainMenuTitle title={title} />
            <MainMenuButtonSet buttons={buttons} />
        </MainMenuBackground>
    );
}

export = MainMenuElement