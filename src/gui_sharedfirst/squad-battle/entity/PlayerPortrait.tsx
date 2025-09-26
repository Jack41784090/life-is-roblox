// filepath: c:\Users\tszmi\Documents\Code\roblox-game\src\gui_sharedfirst\new_components\battle\statusBar\playerPortrait\index.tsx
import { Atom } from "@rbxts/charm";
import { useMotion, useViewport } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { findEntityPortrait, springs } from "shared/utils";
import { EntityUpdate } from "squad-battle/type";
import DamageIndicator from "../../new_components/effects/DamageIndicator";

interface Props {
    entityId: string;
    hp: Atom<number>;
    maxHP: number;
    entityUpdates?: EntityUpdate[];
}

/**
 * Circular player portrait with HP bar surrounding it.
 * The HP bar is a circular arc that surrounds 25% of the portrait in the top-right quadrant when full.
 */
function PlayerPortrait(props: Props) {
    const viewport = useViewport();
    const [hpRatio, hpMotion] = useMotion(1);
    const hp = useAtom(props.hp);
    const [damageIndicators, setDamageIndicators] = useState<Array<{ id: number, damage: number, position: UDim2 }>>([]);

    useEffect(() => {
        hpMotion.spring(hp / props.maxHP, springs.slow);
    }, [hp]);

    // Process entity updates to create damage indicators
    useEffect(() => {
        if (!props.entityUpdates || props.entityUpdates.size() === 0) return;

        const newIndicators: Array<{ id: number, damage: number, position: UDim2 }> = [];

        props.entityUpdates.forEach((update, index) => {
            // Check if this is an HP change
            if (update.change.property === "HP") {
                const damage = update.change.from - update.change.to;
                if (damage > 0) { // Only show positive damage (health loss)
                    // Generate random position around the portrait
                    const randomX = 0.3 + math.random() * 0.4; // Between 0.3 and 0.7
                    const randomY = 0.2 + math.random() * 0.6; // Between 0.2 and 0.8

                    newIndicators.push({
                        id: tick() * 1000 + index, // Unique ID
                        damage: damage,
                        position: UDim2.fromScale(randomX, randomY)
                    });
                }
            }
        });

        if (newIndicators.size() > 0) {
            setDamageIndicators(prev => [...prev, ...newIndicators]);
        }
    }, [props.entityUpdates]);

    const removeDamageIndicator = (id: number) => {
        setDamageIndicators(prev => prev.filter(indicator => indicator.id !== id));
    };

    // Find portrait using utility function
    const portraitImage = findEntityPortrait(props.entityId, 'neutral');

    const circleSize = 0.25; // Size of the circle (25% of the screen size)
    return (
        <frame
            key={"PlayerPortrait-" + props.entityId}
            Size={UDim2.fromScale(.8, .8)}
            // Size={UDim2.fromScale(1, 1)}
            BackgroundTransparency={1}
            SizeConstraint={
                viewport.getValue().Y < viewport.getValue().X
                    ? Enum.SizeConstraint.RelativeYY
                    : Enum.SizeConstraint.RelativeXX
            }
        >
            {/* Create HP bar segments around the portrait */}
            {(() => {
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
                            BackgroundColor3={hpRatio.map(ratio => {
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
            })()}


            {/* Background circle */}
            <frame
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                Size={UDim2.fromScale(0.9, 0.9)}
                BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
                BackgroundTransparency={0}
                ZIndex={0} // Above the HP bar
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </frame>

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

            {/* Damage Indicators */}
            {damageIndicators.map((indicator) => (
                <DamageIndicator
                    key={indicator.id}
                    damage={indicator.damage}
                    position={indicator.position}
                    onComplete={() => removeDamageIndicator(indicator.id)}
                />
            ))}
        </frame>
    );
}

export = PlayerPortrait;