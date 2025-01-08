import { Atom } from "@rbxts/charm";
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { springs } from "shared/utils";

interface Props {
    hp: Atom<number>;
    maxHP: number,
}

function HPBar(props: Props) {
    const [bar, barMotion] = useMotion(0.5);
    const hp = useAtom(props.hp);
    print("HPBar", hp, props.maxHP);

    useEffect(() => {
        barMotion.spring(hp / props.maxHP, springs.slow);
    }, [hp]);


    return (
        <frame
            key={"ReadinessBar"}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={new UDim2(0.5, 0, 0.1, 0)}
            Size={new UDim2(0.8, 0, 0.04, 0)}
            BackgroundTransparency={0.25}
            BackgroundColor3={new Color3(1, 0.03, 0.03)}
            BorderColor3={new Color3(0, 0, 0)}
            BorderSizePixel={2}
        >
            <frame Size={bar.map(v => UDim2.fromScale(v, 1))} BackgroundColor3={new Color3(0.03, 1, 0.03)} />
        </frame>
    );
}

export = HPBar;
