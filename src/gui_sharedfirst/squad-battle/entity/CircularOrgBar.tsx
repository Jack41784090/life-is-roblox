import React, { Binding } from "@rbxts/react";

interface CircularOrgBarProps {
    orgRatio: Binding<number>;
}

function CircularOrgBar({ orgRatio }: CircularOrgBarProps) {
    const segments = [];
    const totalSegments = 8;
    const startAngle = 90;
    const endAngle = 450;
    const anglePerSegment = (endAngle - startAngle) / totalSegments;
    const radius = 0.5;

    for (let i = 0; i < totalSegments; i++) {
        const angle = startAngle + i * anglePerSegment;
        const radians = math.rad(angle);
        const x = math.cos(radians) * radius;
        const y = math.sin(radians) * radius;

        segments.push(
            <frame
                key={`segment_${i}`}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5 + x, 0.5 - y)}
                Size={UDim2.fromScale(.1, .1)}
                BackgroundColor3={orgRatio.map((ratio: number) => {
                    const filledSegments = math.round(ratio * totalSegments);
                    return i < filledSegments
                        ? new Color3(0, 0.8, 0)
                        : new Color3(0.3, 0.3, 0.3);
                })}
                BorderSizePixel={0}
                ZIndex={1}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </frame>
        );
    }

    return <>{segments}</>;
}

export = CircularOrgBar;
