import Charm, { subscribe } from "@rbxts/charm";
import React from "@rbxts/react";
import LoadingScreenBackground from "./components/background";
import LoadingScreenBar from "./components/bar";

interface Props {
    progress: Charm.Atom<number>;
}

function LoadingScreenElement(props: Props) {
    const { progress } = props;

    const cleanUp = subscribe(progress, v => {
        if (v === 1) {
            // loading screen dissipates
            cleanUp();
        }
    })

    return (
        <LoadingScreenBackground {...props}>
            <LoadingScreenBar progress={progress} />
        </LoadingScreenBackground>
    );
}

export = LoadingScreenElement