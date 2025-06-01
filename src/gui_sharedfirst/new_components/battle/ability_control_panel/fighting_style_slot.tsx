import React, { useState } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";

interface FightingStyleSlotProps {
    style: FightingStyleState;
    index: number;
    isActive: boolean;
    entity: Entity;
    onSelect: (index: number) => void;
}

function FightingStyleSlot({ style, index, isActive, entity, onSelect }: FightingStyleSlotProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<Vector2>(new Vector2(0, 0));

    const tooltipWidth = 280;
    const tooltipHeight = 200;

    const updateTooltipPosition = () => {
        const mouse = game.GetService("Players").LocalPlayer!.GetMouse();
        const camera = game.GetService("Workspace").CurrentCamera;

        if (!camera) return;

        const viewportSize = camera.ViewportSize;
        const [topLeftInset] = game.GetService("GuiService").GetGuiInset();

        let xPos = mouse.X + 15;
        let yPos = mouse.Y + 15;

        if (xPos + tooltipWidth > viewportSize.X) {
            xPos = math.max(0, mouse.X - tooltipWidth - 15);
        }

        if (yPos + tooltipHeight > viewportSize.Y - topLeftInset.Y) {
            yPos = math.max(topLeftInset.Y, mouse.Y - tooltipHeight - 15);
        }

        setTooltipPosition(new Vector2(xPos, yPos));
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
        updateTooltipPosition();
    };

    const handleMouseMove = () => {
        if (isHovering) {
            updateTooltipPosition();
        }
    };

    const handleClick = () => {
        if (!isActive) {
            onSelect(index);
        }
    };

    const switchCost = entity.getFightingStyles()[index].getSwitchCost();

    const UI_COLORS = {
        BACKGROUND: new Color3(0, 0, 0),
        TEXT_PRIMARY: new Color3(1, 1, 1),
        TEXT_SECONDARY: new Color3(0.8, 0.8, 0.8),
        TEXT_HIGHLIGHT: new Color3(1, 0.8, 0.2),
        DIVIDER: new Color3(0.3, 0.3, 0.3),
        HEADER: new Color3(0.7, 0.7, 1),
        ACTIVE: new Color3(0.4, 0.8, 0.4),
        INACTIVE: new Color3(0.6, 0.6, 0.8),
        BORDER: new Color3(1, 1, 1)
    };

    return (
        <>
            <imagebutton
                Size={UDim2.fromScale(isActive ? 0.25 : 0.2, 1)}
                BackgroundColor3={isActive ? UI_COLORS.ACTIVE : UI_COLORS.INACTIVE}
                BorderSizePixel={1}
                BorderColor3={isActive ? UI_COLORS.ACTIVE : UI_COLORS.BORDER}
                SizeConstraint={"RelativeXX"}
                Event={{
                    MouseButton1Click: handleClick,
                    MouseEnter: handleMouseEnter,
                    MouseLeave: () => setIsHovering(false),
                    MouseMoved: handleMouseMove
                }}
            >
                <uiaspectratioconstraint AspectRatio={1} />
                <uicorner CornerRadius={new UDim(0, 6)} />

                <textlabel
                    Size={UDim2.fromScale(1, 0.6)}
                    Position={UDim2.fromScale(0, 0)}
                    BackgroundTransparency={1}
                    TextColor3={UI_COLORS.TEXT_PRIMARY}
                    TextSize={14}
                    Font={Enum.Font.GothamBold}
                    Text={style.name.sub(0, 1)}
                    TextScaled={true}
                />

                <textlabel
                    Size={UDim2.fromScale(1, 0.4)}
                    Position={UDim2.fromScale(0, 0.6)}
                    BackgroundTransparency={1}
                    TextColor3={UI_COLORS.TEXT_SECONDARY}
                    TextSize={8}
                    Font={Enum.Font.Gotham}
                    Text={isActive ? "ACTIVE" : `${switchCost} POS`}
                    TextScaled={true}
                />
            </imagebutton>

            {isHovering && (
                <screengui
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    DisplayOrder={10}
                    IgnoreGuiInset={true}
                >
                    <frame
                        Size={UDim2.fromOffset(tooltipWidth, tooltipHeight)}
                        Position={UDim2.fromOffset(tooltipPosition.X, tooltipPosition.Y)}
                        BackgroundColor3={UI_COLORS.BACKGROUND}
                        BackgroundTransparency={0.2}
                        BorderSizePixel={0}
                        ZIndex={100}
                    >
                        <uicorner CornerRadius={new UDim(0, 6)} />
                        <uistroke Color={UI_COLORS.BORDER} Transparency={0.7} Thickness={1} />
                        <uipadding
                            PaddingLeft={new UDim(0, 10)}
                            PaddingRight={new UDim(0, 10)}
                            PaddingTop={new UDim(0, 10)}
                            PaddingBottom={new UDim(0, 10)}
                        />
                        <uilistlayout
                            SortOrder={Enum.SortOrder.LayoutOrder}
                            Padding={new UDim(0, 5)}
                        />

                        <textlabel
                            Size={UDim2.fromScale(1, 0.15)}
                            BackgroundTransparency={1}
                            TextColor3={UI_COLORS.TEXT_PRIMARY}
                            TextSize={16}
                            Font={Enum.Font.GothamBold}
                            Text={style.name}
                            TextXAlignment={Enum.TextXAlignment.Left}
                            LayoutOrder={0}
                        />

                        <textlabel
                            Size={UDim2.fromScale(1, 0.2)}
                            BackgroundTransparency={1}
                            TextColor3={UI_COLORS.TEXT_SECONDARY}
                            TextSize={12}
                            Font={Enum.Font.Gotham}
                            Text={style.description}
                            TextXAlignment={Enum.TextXAlignment.Left}
                            TextWrapped={true}
                            LayoutOrder={1}
                        />

                        <frame
                            Size={UDim2.fromScale(1, 0.02)}
                            BackgroundColor3={UI_COLORS.DIVIDER}
                            BorderSizePixel={0}
                            LayoutOrder={2}
                        />

                        <textlabel
                            Size={UDim2.fromScale(1, 0.1)}
                            BackgroundTransparency={1}
                            TextColor3={UI_COLORS.HEADER}
                            TextSize={12}
                            Font={Enum.Font.GothamBold}
                            Text="Abilities"
                            TextXAlignment={Enum.TextXAlignment.Center}
                            LayoutOrder={3}
                        />

                        <frame
                            Size={UDim2.fromScale(1, 0.2)}
                            BackgroundTransparency={1}
                            LayoutOrder={4}
                        >
                            <uilistlayout
                                FillDirection={Enum.FillDirection.Horizontal}
                                HorizontalAlignment={Enum.HorizontalAlignment.Left}
                                Padding={new UDim(0, 5)}
                                SortOrder={Enum.SortOrder.LayoutOrder}
                            />
                            {style.availableAbilities.map((ability, i) => (
                                <frame
                                    key={`ability-${i}`}
                                    Size={UDim2.fromOffset(30, 30)}
                                    BackgroundColor3={new Color3(0.2, 0.6, 0.9)}
                                    BorderSizePixel={0}
                                    LayoutOrder={i}
                                >
                                    <uicorner CornerRadius={new UDim(0, 4)} />
                                    <textlabel
                                        Size={UDim2.fromScale(1, 1)}
                                        BackgroundTransparency={1}
                                        TextColor3={UI_COLORS.TEXT_PRIMARY}
                                        Font={Enum.Font.GothamBold}
                                        TextSize={12}
                                        Text={ability.sub(0, 1)}
                                    />
                                </frame>
                            ))}
                        </frame>

                        <textlabel
                            Size={UDim2.fromScale(1, 0.1)}
                            BackgroundTransparency={1}
                            TextColor3={UI_COLORS.HEADER}
                            TextSize={12}
                            Font={Enum.Font.GothamBold}
                            Text="Passive Effects"
                            TextXAlignment={Enum.TextXAlignment.Center}
                            LayoutOrder={5}
                        />

                        <scrollingframe
                            Size={UDim2.fromScale(1, 0.23)}
                            BackgroundTransparency={1}
                            CanvasSize={UDim2.fromScale(0, 0)}
                            AutomaticCanvasSize={Enum.AutomaticSize.Y}
                            ScrollBarThickness={2}
                            LayoutOrder={6}
                        >
                            <uilistlayout
                                SortOrder={Enum.SortOrder.LayoutOrder}
                                Padding={new UDim(0, 2)}
                            />
                            {style.passiveEffects.map((effect, i) => (
                                <textlabel
                                    key={`effect-${i}`}
                                    Size={UDim2.fromScale(1, 0)}
                                    AutomaticSize={Enum.AutomaticSize.Y}
                                    BackgroundTransparency={1}
                                    TextColor3={UI_COLORS.TEXT_SECONDARY}
                                    Font={Enum.Font.Gotham}
                                    TextSize={10}
                                    TextXAlignment={Enum.TextXAlignment.Left}
                                    Text={`• ${effect.description}`}
                                    TextWrapped={true}
                                    LayoutOrder={i}
                                />
                            ))}
                        </scrollingframe>
                    </frame>
                </screengui>
            )}
        </>
    );
}

export default FightingStyleSlot;
