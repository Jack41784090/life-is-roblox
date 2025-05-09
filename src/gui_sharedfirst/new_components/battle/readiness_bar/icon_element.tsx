import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { ReadinessIcon } from "shared/class/battle/types";
import { findEntityPortrait, springs } from "shared/utils";

interface Props {
    icon: ReadinessIcon;
    index: number;
}

function ReadinessIconElement(props: Props) {
    const { readiness: entityReadiness, iconUrl } = props.icon
    const readinessPercent = useAtom(entityReadiness);
    const [rPos, motion] = useMotion(readinessPercent);

    let portraitImage = findEntityPortrait(iconUrl, 'neutral');

    useEffect(() => {
        motion.spring(readinessPercent / 100, springs.slow);
    }, [readinessPercent]);

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
                Size={UDim2.fromScale(1, 1)}
                Text={string.format("%.2f", readinessPercent)}
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
