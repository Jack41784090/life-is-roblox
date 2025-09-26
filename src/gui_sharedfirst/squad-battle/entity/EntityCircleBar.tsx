import React, { Binding } from "@rbxts/react";

function EntityCircleBar(props: { hpRatio: Binding<number> }) {
    const segments = [];
    const totalSegments = 4; // Segments for 25% of the circle
    const startAngle = 90; // Start angle
    const endAngle = 450; // End angle
    const anglePerSegment = (endAngle - startAngle) / totalSegments;
    const ringWidth = 0.1; // Width of the HP ring (increased for visibility)
    const radius = 0.5; // Radius of the circle (from center to edge)

    // Create segments to form a circular ring in the first quadrant
    for (let i = 0; i < totalSegments; i++) {
        const angle = startAngle + i * anglePerSegment;
        const radians = math.rad(angle);

        // Calculate position on the circle's perimeter
        const x = math.cos(radians) * radius;
        const y = math.sin(radians) * radius;

        segments.push(
            <frame
                key={`segment_${i}`}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5 + x, 0.5 - y)} // Note: y is negated to match screen coordinates
                Size={new UDim2(0, ringWidth * 150, 0, ringWidth * 150)} // Fixed pixel size for consistent width
                BackgroundColor3={props.hpRatio.map(ratio => {
                    const filledSegments = math.ceil(ratio * totalSegments);
                    return i < filledSegments
                        ? new Color3(0, 0.8, 0) // Green for filled segments
                        : new Color3(0.3, 0.3, 0.3); // Gray for empty segments
                })}
                BorderSizePixel={0} // Remove border
                ZIndex={1} // Ensure HP bar is behind portrait
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </frame>
        );
    }

    return segments;
}

export = EntityCircleBar;