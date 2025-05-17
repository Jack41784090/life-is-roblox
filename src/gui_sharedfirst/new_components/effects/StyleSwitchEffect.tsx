import React, { useBinding } from "@rbxts/react";
import { TWEEN_TIME } from "shared/const";

interface StyleSwitchEffectProps {
    position: UDim2;
    color: Color3;
    onComplete?: () => void;
}

export default function StyleSwitchEffect({ position, color, onComplete }: StyleSwitchEffectProps) {
    const [size, setSize] = useBinding(new UDim2(0, 0, 0, 0));
    const [transparency, setTransparency] = useBinding(0);

    React.useEffect(() => {
        // Animate the style switch effect - ripple outward and fade
        const startTime = tick();

        const connection = game.GetService("RunService").RenderStepped.Connect((dt) => {
            const elapsed = tick() - startTime;
            const progress = math.clamp(elapsed / TWEEN_TIME, 0, 1);

            // Expand outward in a circle
            const newSize = 200 * progress;
            setSize(new UDim2(0, newSize, 0, newSize));

            // Fade out gradually after initial visibility
            const transparencyProgress = progress < 0.2 ? 0 : (progress - 0.2) / 0.8;
            setTransparency(transparencyProgress);

            // Cleanup when animation completes
            if (progress >= 1) {
                connection.Disconnect();
                if (onComplete) onComplete();
            }
        });

        return () => connection.Disconnect();
    }, []);

    return (
        <frame
            Position={position}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Size={size}
            BackgroundTransparency={transparency}
            BackgroundColor3={color}
            Rotation={transparency.map(t => 360 * t)}
            ZIndex={10}
        >
            <uicorner CornerRadius={new UDim(1, 0)} />
            <uistroke
                Color={color}
                Thickness={3}
                Transparency={transparency}
            />
            <uigradient
                Rotation={90}
                Transparency={transparency.map(t => new NumberSequence([
                    new NumberSequenceKeypoint(0, math.clamp(t, 0, 0.7)),
                    new NumberSequenceKeypoint(1, 1)
                ]))}
            />
        </frame>
    );
}
