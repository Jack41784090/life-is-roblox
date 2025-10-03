import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useRef } from "@rbxts/react";
// import * from "@rbxts/ripple"
import { springs } from "shared/utils";
import { EntityPortraitProps } from "../type";

function EntityPortrait({ portraitImage, isRetreating = false, isDying = false, upsideDown = false, isAttacking = false, setAttacking }: EntityPortraitProps) {
    const [rotation, rotationMotion] = useMotion(0);
    const [scale, scaleMotion] = useMotion(1);
    const animationCleanupRef = useRef<thread | undefined>();
    const isAnimatingRef = useRef(false);

    // Attack animation - elegant one-shot animation with proper cleanup
    useEffect(() => {
        if (isAttacking && !isAnimatingRef.current) {
            isAnimatingRef.current = true;

            // Cancel any existing animation
            if (animationCleanupRef.current) {
                task.cancel(animationCleanupRef.current);
            }

            // Ensure clean starting state
            scaleMotion.set(1);

            // Start animation sequence
            animationCleanupRef.current = task.spawn(() => {
                // Phase 1: Scale up (attack forward)
                scaleMotion.tween(1.6, {
                    time: 0.1,
                    style: Enum.EasingStyle.Back,
                    direction: Enum.EasingDirection.Out,
                });

                task.wait(0.1);

                // Phase 2: Scale back (recoil)
                scaleMotion.tween(1, {
                    time: 0.15,
                    style: Enum.EasingStyle.Back,
                    direction: Enum.EasingDirection.In,
                });

                task.wait(0.15);

                // Reset animation state
                isAnimatingRef.current = false;
                animationCleanupRef.current = undefined;
                setAttacking?.(false);
            });
        }
    }, [isAttacking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationCleanupRef.current) {
                task.cancel(animationCleanupRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isDying) {
            // Spin the portrait multiple times while scaling it down to 0
            rotationMotion.spring(360 + 1080 * math.random(), springs.responsive); // 4 full rotations (360 * 4 degrees)
            scaleMotion.tween(0, {
                time: 1,
                style: Enum.EasingStyle.Exponential,
                direction: Enum.EasingDirection.In,
            });
        }
    }, [isDying]);

    useEffect(() => {
        scaleMotion.tween(isRetreating ? 0 : 1, {
            time: 1,
            style: Enum.EasingStyle.Exponential,
            direction: Enum.EasingDirection.In,
        });
    }, [isRetreating]);

    return (
        <frame
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={scale.map(s => UDim2.fromScale(0.5, upsideDown ?
                .5 - .5 * (1 - s) :
                .5 + .5 * (1 - s)))}
            Size={scale.map(s => UDim2.fromScale(0.8 * s, 0.8 * s))}
            BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            ZIndex={0} // Above the HP bar
            Rotation={rotation}
            Transparency={isDying ? 1 : 0}
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
            // ImageTransparency={scale.map(s => 1 - s)}
            >
                <uicorner CornerRadius={new UDim(1, 0)} />
            </imagelabel>
            {/* {
                isRetreating ?
                    <textlabel
                        AnchorPoint={new Vector2(1, 0)}
                        Position={UDim2.fromScale(1, 0)}
                        Size={UDim2.fromScale(0.3, 0.3)}
                        BackgroundTransparency={1}
                        Text="🏳️"
                        ZIndex={1}
                    /> :
                    <></>
            } */}
        </frame >);
}

export = EntityPortrait;