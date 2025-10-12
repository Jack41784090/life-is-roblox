import { useMotion } from "@rbxts/pretty-react-hooks";
import React from "@rbxts/react";
import { springs } from "shared/utils";

interface AbilityUseEffectProps {
    position: UDim2;
    abilityName: string;
    color: Color3;
    onComplete?: () => void;
}

export default function AbilityUseEffect({ position, abilityName, color, onComplete }: AbilityUseEffectProps) {
    const [transparency, transparencyMotion] = useMotion(1);
    const [scale, scaleMotion] = useMotion(0.6);
    const [rotation, rotationMotion] = useMotion(math.random(-15, 15));

    React.useEffect(() => {
        transparencyMotion.spring(0, springs.responsive);
        scaleMotion.spring(1.1, springs.bubbly);
        rotationMotion.spring(0, springs.responsive);

        task.delay(0.3, () => {
            transparencyMotion.spring(1, springs.slow);
            scaleMotion.spring(1.0, springs.slow);
        });

        task.delay(1.0, () => {
            if (onComplete) onComplete();
        });
    }, []);

    return (
        <frame
            Position={position}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Size={scale.map(s => new UDim2(0, 200 * s, 0, 60 * s))}
            BackgroundColor3={new Color3(0.1, 0.1, 0.12)}
            BackgroundTransparency={1}
            Rotation={rotation}
            ZIndex={10}
        >
            <uicorner CornerRadius={new UDim(0, 10)} />
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
        </frame>
    );
}
