import React, { useBinding } from "@rbxts/react";

interface AbilityReactionEffectProps {
    position: UDim2;
    color: Color3;
    abilityName: string;
    onComplete?: () => void;
}

const TWEEN_TIME = 1.5; // Duration of the animation in seconds

export default function AbilityReactionEffect({ position, color, abilityName, onComplete }: AbilityReactionEffectProps) {
    const [transparency, setTransparency] = useBinding(0);
    const [scale, setScale] = useBinding(0.7);
    const [rotation, setRotation] = useBinding(0);

    React.useEffect(() => {
        // Animate the ability reaction effect
        const startTime = tick();
        const initialRotation = math.random(-20, 20);

        const connection = game.GetService("RunService").RenderStepped.Connect((dt) => {
            const elapsed = tick() - startTime;
            const progress = math.clamp(elapsed / TWEEN_TIME, 0, 1);

            // Flash in quickly then fade out
            const transparencyValue = progress < 0.2
                ? (1 - progress / 0.2)
                : (progress - 0.2) / 0.8;
            setTransparency(transparencyValue);

            // Scale up quickly then settle
            const scaleValue = progress < 0.3
                ? 0.7 + (0.5 * (progress / 0.3))
                : 1.2 - (0.2 * ((progress - 0.3) / 0.7));
            setScale(scaleValue);

            // Rotate slightly for dynamic effect
            setRotation(initialRotation * (1 - progress));

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
            Size={scale.map(s => new UDim2(0, 50 * s, 0, 50 * s))}
            BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
            BackgroundTransparency={transparency.map(t => math.min(t + 0.2, 1))}
            Rotation={rotation}
            ZIndex={10}
        >
            <uicorner CornerRadius={new UDim(0, 8)} />
            <uistroke
                Color={color}
                Thickness={3}
                Transparency={transparency}
            />
            <textlabel
                Size={new UDim2(1, 0, 1, 0)}
                BackgroundTransparency={1}
                TextTransparency={transparency}
                Text={`${abilityName}`}
                TextColor3={new Color3(1 - color.R, 1 - color.G, 1 - color.B)}
                Font={Enum.Font.GothamBold}
                TextSize={scale.map(s => 16 * s)}
                TextScaled={false}
            />
            <uipadding
                PaddingLeft={new UDim(0, 10)}
                PaddingRight={new UDim(0, 10)}
                PaddingTop={new UDim(0, 5)}
                PaddingBottom={new UDim(0, 5)}
            />
        </frame>
    );
}
