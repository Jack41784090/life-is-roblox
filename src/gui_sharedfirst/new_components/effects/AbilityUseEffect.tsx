import React, { useBinding } from "@rbxts/react";
import { TWEEN_TIME } from "shared/const";

interface AbilityUseEffectProps {
    position: UDim2;
    abilityName: string;
    color: Color3;
    onComplete?: () => void;
}

export default function AbilityUseEffect({ position, abilityName, color, onComplete }: AbilityUseEffectProps) {
    const [transparency, setTransparency] = useBinding(0);
    const [scale, setScale] = useBinding(0.6);
    const [rotation, setRotation] = useBinding(0);

    React.useEffect(() => {
        // Animate the ability use effect
        const startTime = tick();
        const initialRotation = math.random(-15, 15);

        const connection = game.GetService("RunService").RenderStepped.Connect((dt) => {
            const elapsed = tick() - startTime;
            const progress = math.clamp(elapsed / TWEEN_TIME, 0, 1);

            // Flash in quickly then fade out
            const transparencyValue = progress < 0.3
                ? 1 - progress * 3
                : (progress - 0.3) / 0.7;
            setTransparency(transparencyValue);

            // Scale up quickly then settle
            const scaleValue = progress < 0.4
                ? 0.6 + (progress * 1.0)
                : 1.0 + ((1 - progress) * 0.1);
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
            Size={scale.map(s => new UDim2(0, 200 * s, 0, 60 * s))}
            BackgroundColor3={new Color3(0.1, 0.1, 0.12)}
            BackgroundTransparency={transparency.map(t => math.min(t + 0.1, 1))}
            Rotation={rotation}
            ZIndex={10}
        >
            <uicorner CornerRadius={new UDim(0, 10)} />
            <uistroke
                Color={color}
                Thickness={3}
                Transparency={transparency}
            />
            <uigradient
                Color={new ColorSequence([
                    new ColorSequenceKeypoint(0, color),
                    new ColorSequenceKeypoint(0.5, new Color3(
                        color.R * 0.8,
                        color.G * 0.8,
                        color.B * 0.8
                    )),
                    new ColorSequenceKeypoint(1, color)
                ])}
                Offset={new Vector2(0, 0)}
                Rotation={45}
                Transparency={transparency.map(t => new NumberSequence([
                    new NumberSequenceKeypoint(0, math.max(t * 0.8, 0)),
                    new NumberSequenceKeypoint(1, math.max(t * 0.8, 0))
                ]))}
            />
            <textlabel
                Text={string.upper(abilityName)}
                Size={new UDim2(1, 0, 1, 0)}
                BackgroundTransparency={1}
                TextColor3={new Color3(1, 1, 1)}
                TextTransparency={transparency}
                Font={Enum.Font.GothamBold}
                TextSize={scale.map(s => 24 * s)}
                TextStrokeTransparency={transparency.map(t => math.max(t - 0.5, 0))}
                TextStrokeColor3={color}
            />

            <frame
                Size={new UDim2(1, 0, 0, 2)}
                Position={new UDim2(0, 0, 1, -2)}
                BackgroundColor3={color}
                BackgroundTransparency={transparency.map(t => math.min(t + 0.2, 1))}
                BorderSizePixel={0}
            />
            <frame
                Size={new UDim2(1, 0, 0, 2)}
                Position={new UDim2(0, 0, 0, 0)}
                BackgroundColor3={color}
                BackgroundTransparency={transparency.map(t => math.min(t + 0.2, 1))}
                BorderSizePixel={0}
            />
        </frame>
    );
}
