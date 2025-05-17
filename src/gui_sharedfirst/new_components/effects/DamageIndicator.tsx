import React, { useBinding } from "@rbxts/react";
import { CONDOR_BLOOD_RED, TWEEN_TIME } from "shared/const";

interface DamageIndicatorProps {
    damage: number;
    position: UDim2;
    onComplete?: () => void;
}

export default function DamageIndicator({ damage, position, onComplete }: DamageIndicatorProps) {
    const [positionBinding, setPosition] = useBinding(position);
    const [transparency, setTransparency] = useBinding(0);
    const [textSize, setTextSize] = useBinding(28);

    React.useEffect(() => {
        // Animate the damage number floating up and fading out
        const startTime = tick();

        const connection = game.GetService("RunService").RenderStepped.Connect((dt) => {
            const elapsed = tick() - startTime;
            const progress = math.clamp(elapsed / TWEEN_TIME, 0, 1);

            // Move upward with easing
            const newYPosition = position.Y.Offset - (50 * progress);
            setPosition(new UDim2(
                position.X.Scale,
                position.X.Offset + math.sin(progress * math.pi) * 20,
                position.Y.Scale,
                newYPosition
            ));

            // Fade out
            setTransparency(progress);

            // Scale text size for emphasis
            const newSize = 28 + math.sin(progress * math.pi) * 10;
            setTextSize(newSize);

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
            Position={positionBinding}
            Size={new UDim2(0, 100, 0, 50)}
            BackgroundTransparency={1}
        >
            <textlabel
                Size={new UDim2(1, 0, 1, 0)}
                BackgroundTransparency={1}
                TextTransparency={transparency}
                Text={`-${damage}`}
                TextColor3={CONDOR_BLOOD_RED}
                TextStrokeColor3={new Color3(0, 0, 0)}
                TextStrokeTransparency={transparency.map(t => math.clamp(t - 0.3, 0, 1))}
                Font={Enum.Font.GothamBold}
                TextSize={textSize}
                TextScaled={false}
            />
        </frame>
    );
}
