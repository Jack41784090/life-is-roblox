import Charm from "@rbxts/charm";
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { springs } from "shared/utils";
import Background from "./components/background";
import Bar from "./components/bar";

interface Props {
    progress: Charm.Atom<number>;
}

function LoadingScreenElement(props: Props) {
    const { progress } = props;

    const value = useAtom(progress);
    const [p, motion] = useMotion(value);

    useEffect(() => {
        const thicknessNow = p.getValue();
        if (value > thicknessNow) {
            motion.spring(value, springs.slow);
        }
        if (value == 1) {
            // done
        }
    }, [value]);

    return (
        <Background {...props}>
            <Bar progress={p} />
        </Background>
    );
}

export = LoadingScreenElement