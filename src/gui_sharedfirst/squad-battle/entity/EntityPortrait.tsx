import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect } from "@rbxts/react";
import { springs } from "shared/utils";

interface EntityPortraitProps {
    portraitImage: string;
    isDying?: boolean;
}

function EntityPortrait({ portraitImage, isDying = false }: EntityPortraitProps) {
    const [rotation, rotationMotion] = useMotion(0);
    const [scale, scaleMotion] = useMotion(1);

    useEffect(() => {
        if (isDying) {
            // Spin the portrait multiple times while scaling it down to 0
            rotationMotion.spring(1440, springs.responsive); // 4 full rotations (360 * 4 degrees)
            scaleMotion.spring(0, springs.responsive);
        }
    }, [isDying]);
    return (
        <frame
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.5)}
            Size={scale.map(s => UDim2.fromScale(0.9 * s, 0.9 * s))}
            BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={0}
            ZIndex={0} // Above the HP bar
            Rotation={rotation}
        >
            <uicorner CornerRadius={new UDim(1, 0)} />
            {/* Player Portrait */}
            <imagelabel
                Image={portraitImage}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                Size={UDim2.fromScale(0.85, 0.85)}
                BackgroundTransparency={1}
                ZIndex={0} // Above the background
                ScaleType={Enum.ScaleType.Crop}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </imagelabel>
        </frame >);
}

export = EntityPortrait;