import React, { useBinding, useEffect } from "@rbxts/react";
import { RunService } from "@rbxts/services";
import { DetailedHitAnalysisData } from "shared/class/battle/Client/Effects/types";

interface SequentialRollRevealEffectProps {
    position: UDim2;
    analysisData: DetailedHitAnalysisData;
    onComplete?: () => void;
}

const REVEAL_DURATION = 2.5;
const FADE_IN_TIME = 0.3;
const PAUSE_TIME = 1.5;
const FADE_OUT_TIME = 0.7;

export default function SequentialRollRevealEffect({
    position,
    analysisData,
    onComplete
}: SequentialRollRevealEffectProps) {
    const [positionBinding, setPosition] = useBinding(position);
    const [transparency, setTransparency] = useBinding(1);
    const [scale, setScale] = useBinding(0.8);
    const [phase, setPhase] = useBinding<"reveal" | "pause" | "fadeout">("reveal");

    const getFateColor = (fate: string): Color3 => {
        switch (fate) {
            case "CRIT":
                return new Color3(1, 0.8, 0);
            case "Hit":
                return new Color3(0.2, 0.8, 0.2);
            case "Miss":
                return new Color3(0.8, 0.2, 0.2);
            case "Cling":
                return new Color3(0.8, 0.6, 0.2);
            default:
                return new Color3(0.7, 0.7, 0.7);
        }
    };

    const getCheckTypeColor = (checkType: "DV" | "PV"): Color3 => {
        return checkType === "DV" ?
            new Color3(0.3, 0.6, 1) :
            new Color3(1, 0.6, 0.2);
    };

    const formatSuccessMargin = (): string => {
        const total = analysisData.roll + analysisData.bonus;
        const margin = total - analysisData.target;
        if (margin >= 0) {
            return `+${margin}`;
        } else {
            return `${margin}`;
        }
    };

    useEffect(() => {
        const startTime = tick();

        const connection = RunService.RenderStepped.Connect(() => {
            const elapsed = tick() - startTime;

            if (elapsed < FADE_IN_TIME) {
                const fadeProgress = elapsed / FADE_IN_TIME;
                setTransparency(1 - fadeProgress);
                setScale(0.8 + (0.2 * fadeProgress));
                setPhase("reveal");
            } else if (elapsed < FADE_IN_TIME + PAUSE_TIME) {
                setTransparency(0);
                setScale(1);
                setPhase("pause");
            } else if (elapsed < FADE_IN_TIME + PAUSE_TIME + FADE_OUT_TIME) {
                const fadeProgress = (elapsed - FADE_IN_TIME - PAUSE_TIME) / FADE_OUT_TIME;
                setTransparency(fadeProgress);
                setScale(1 + (0.1 * fadeProgress));
                setPhase("fadeout");
            } else {
                connection.Disconnect();
                if (onComplete) onComplete();
            }
        });

        return () => connection.Disconnect();
    }, []);

    return (
        <frame
            Position={positionBinding}
            Size={new UDim2(0, 300, 0, 200)}
            AnchorPoint={new Vector2(0.5, 0.5)}
            BackgroundColor3={new Color3(0.1, 0.1, 0.15)}
            BackgroundTransparency={transparency.map(t => math.clamp(t + 0.2, 0, 1))}
            BorderSizePixel={2}
            BorderColor3={getFateColor(analysisData.fate)}
        >
            <uicorner CornerRadius={new UDim(0, 8)} />
            <uistroke
                Color={getFateColor(analysisData.fate)}
                Thickness={2}
                Transparency={transparency}
            />

            <frame
                Size={new UDim2(1, -16, 1, -16)}
                Position={new UDim2(0, 8, 0, 8)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection="Vertical"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Center"
                    Padding={new UDim(0, 4)}
                />

                <textlabel
                    Size={new UDim2(1, 0, 0, 25)}
                    BackgroundTransparency={1}
                    Text={`${analysisData.die} Roll vs ${analysisData.checkType}`}
                    TextColor3={getCheckTypeColor(analysisData.checkType)}
                    TextTransparency={transparency}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                <frame
                    Size={new UDim2(1, 0, 0, 40)}
                    BackgroundTransparency={1}
                >
                    <uilistlayout
                        FillDirection="Horizontal"
                        HorizontalAlignment="Center"
                        VerticalAlignment="Center"
                        Padding={new UDim(0, 8)}
                    />

                    <textlabel
                        Size={new UDim2(0, 60, 1, 0)}
                        BackgroundTransparency={1}
                        Text={tostring(analysisData.roll)}
                        TextColor3={new Color3(1, 1, 1)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.GothamBold}
                    />

                    <textlabel
                        Size={new UDim2(0, 20, 1, 0)}
                        BackgroundTransparency={1}
                        Text="+"
                        TextColor3={new Color3(0.8, 0.8, 0.8)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />

                    <textlabel
                        Size={new UDim2(0, 40, 1, 0)}
                        BackgroundTransparency={1}
                        Text={tostring(analysisData.bonus)}
                        TextColor3={new Color3(0.2, 0.8, 1)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />

                    <textlabel
                        Size={new UDim2(0, 30, 1, 0)}
                        BackgroundTransparency={1}
                        Text="vs"
                        TextColor3={new Color3(0.8, 0.8, 0.8)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />

                    <textlabel
                        Size={new UDim2(0, 40, 1, 0)}
                        BackgroundTransparency={1}
                        Text={tostring(analysisData.target)}
                        TextColor3={getCheckTypeColor(analysisData.checkType)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.GothamBold}
                    />
                </frame>

                <textlabel
                    Size={new UDim2(1, 0, 0, 30)}
                    BackgroundTransparency={1}
                    Text={`${formatSuccessMargin()} - ${analysisData.fate}`}
                    TextColor3={getFateColor(analysisData.fate)}
                    TextTransparency={transparency}
                    TextScaled={true}
                    Font={Enum.Font.GothamBold}
                />

                {analysisData.damage && (analysisData.damage > 0) ? (
                    <textlabel
                        Size={new UDim2(1, 0, 0, 25)}
                        BackgroundTransparency={1}
                        Text={`${analysisData.damage} Damage`}
                        TextColor3={new Color3(1, 0.3, 0.3)}
                        TextTransparency={transparency}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />
                ) : undefined}

                <frame
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                >
                    <uilistlayout
                        FillDirection="Horizontal"
                        HorizontalAlignment="Center"
                        VerticalAlignment="Center"
                        Padding={new UDim(0, 16)}
                    />

                    <textlabel
                        Size={new UDim2(0, 80, 1, 0)}
                        BackgroundTransparency={1}
                        Text={analysisData.weaponName}
                        TextColor3={new Color3(0.8, 0.8, 0.5)}
                        TextTransparency={transparency.map(t => math.clamp(t + 0.3, 0, 1))}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />

                    <textlabel
                        Size={new UDim2(0, 80, 1, 0)}
                        BackgroundTransparency={1}
                        Text={analysisData.armourName}
                        TextColor3={new Color3(0.6, 0.6, 0.8)}
                        TextTransparency={transparency.map(t => math.clamp(t + 0.3, 0, 1))}
                        TextScaled={true}
                        Font={Enum.Font.Gotham}
                    />
                </frame>
            </frame>

            <frame
                Position={scale.map(s => new UDim2(0.5, 0, 0.5, 0))}
                Size={scale.map(s => new UDim2(s, 0, s, 0))}
                AnchorPoint={new Vector2(0.5, 0.5)}
                BackgroundTransparency={1}
            />
        </frame>
    );
}
