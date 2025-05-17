import React, { useBinding } from "@rbxts/react";
import { TWEEN_TIME } from "shared/const";

interface HitImpactEffectProps {
    position: UDim2;
    impactSize?: number;
    color?: Color3;
    onComplete?: () => void;
}

export default function HitImpactEffect({
    position,
    impactSize = 100,
    color = new Color3(1, 0.6, 0.1),
    onComplete
}: HitImpactEffectProps) {
    const [size, setSize] = useBinding(0);
    const [transparency, setTransparency] = useBinding(0);
    const [rotation, setRotation] = useBinding(0);

    React.useEffect(() => {
        // Animate the hit impact effect
        const startTime = tick();
        const initialRotation = math.random(0, 360);
        const direction = math.random() > 0.5 ? 1 : -1;

        const connection = game.GetService("RunService").RenderStepped.Connect((dt) => {
            const elapsed = tick() - startTime;
            const progress = math.clamp(elapsed / (TWEEN_TIME * 0.8), 0, 1);

            // Start small, expand quickly, then fade
            const sizeProgress = math.min(progress * 2, 1);
            setSize(impactSize * sizeProgress);

            // Start opaque, then fade out
            const transparencyValue = progress < 0.3
                ? (progress / 0.3) * 0.2  // Start with some transparency
                : 0.2 + ((progress - 0.3) / 0.7) * 0.8;  // Fade out gradually
            setTransparency(transparencyValue);

            // Rotate for dynamic effect
            setRotation(initialRotation + direction * progress * 30);

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
            Size={size.map(s => new UDim2(0, s, 0, s))}
            BackgroundTransparency={1}
            Rotation={rotation}
            ZIndex={10}
        >
            <imagelabel
                Size={new UDim2(1, 0, 1, 0)}
                Image="rbxassetid://6607841813"  // Impact effect image
                ImageColor3={color}
                ImageTransparency={transparency}
                BackgroundTransparency={1}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={new UDim2(0.5, 0, 0.5, 0)}
            />
            <imagelabel
                Size={new UDim2(0.7, 0, 0.7, 0)}
                Image="rbxassetid://6607841813"  // Inner impact effect
                ImageColor3={new Color3(1, 1, 1)}
                ImageTransparency={transparency.map(t => math.min(t + 0.2, 1))}
                BackgroundTransparency={1}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={new UDim2(0.5, 0, 0.5, 0)}
                Rotation={rotation.map(r => -r * 0.7)}  // Counter-rotation
            />
        </frame>
    );
}
