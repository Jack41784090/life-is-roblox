import { Atom } from "@rbxts/charm";
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useMemo } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { ReadinessFragment } from "shared/class/battle/Systems/TurnSystem/types";
import { findEntityPortrait, springs } from "shared/utils";

interface Props {
    icon: Atom<ReadinessFragment>;
    fullReadinessBarTravelTime: number;
    index: number;
}

function ReadinessIconElement(props: Props) {
    const readinessFragment = useAtom(props.icon);
    const readinessPercent = useAtom(readinessFragment.pos);
    const [rPos, motion] = useMotion(readinessPercent / 100);

    const portraitImage = useMemo(() =>
        readinessFragment.icon ? findEntityPortrait(readinessFragment.icon, 'neutral') : undefined,
        [readinessFragment.icon]
    );

    useEffect(() => {
        motion.spring(readinessPercent / 100, springs.responsive);
    }, [readinessFragment, readinessPercent, motion]);

    return (
        <frame
            Size={new UDim2(1, 50, 1, 50)}
            Position={rPos.map(r => UDim2.fromScale(r, 0.5))}
            SizeConstraint={Enum.SizeConstraint.RelativeYY}
            BackgroundTransparency={1}
        >
            <imagelabel
                AnchorPoint={new Vector2(0.5, 0.5)}
                Size={UDim2.fromScale(1, 1)}
                Image={portraitImage}
                ScaleType={Enum.ScaleType.Crop}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </imagelabel>
            <textlabel
                Font={Enum.Font.Garamond}
                AnchorPoint={new Vector2(0.5, 0.5)}
                key={`Label${props.index}`}
                Position={UDim2.fromScale(0, 0.25)}
                Size={UDim2.fromScale(.6, .6)}
                Text={`${math.round(readinessPercent)}`}
                TextScaled={true}
                BackgroundTransparency={1}
                TextColor3={new Color3(1, 1, 1)}
            >
                <uistroke Color={new Color3(0, 0, 0)} Thickness={1} />
            </textlabel>
        </frame>
    );
}

export = ReadinessIconElement;