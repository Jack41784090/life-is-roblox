import React, { useEffect, useState } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { AbilityConfig, AbilityType, ActiveAbilityConfig } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { onInput } from "shared/utils";

interface AbilitySlotProps {
    cre: Entity;
    abKey: keyof typeof Enum.KeyCode;
    ability: AbilityConfig;
    focus?: boolean;
}

export function AbilitySlot({ cre, abKey, ability, focus = false }: AbilitySlotProps) {
    const [isFocused, setIsFocused] = useState(focus);
    const [isHovering, setIsHovering] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<Vector2>(new Vector2(0, 0));

    const tooltipWidth = 250;
    const tooltipHeight = 220;

    const activateAbility = () => {
        setIsFocused(true);
        cre.armed = abKey;
    };

    useEffect(() => {
        const handleKeyPress = (input: InputObject) => {
            if (input.KeyCode.Name === abKey) {
                activateAbility();
            } else if (isFocused) {
                setIsFocused(false);
            }
        };

        const connection = onInput(Enum.UserInputType.Keyboard, handleKeyPress);
        return () => connection.Disconnect();
    }, [abKey, cre, isFocused]);

    const updateTooltipPosition = () => {
        const mouse = game.GetService("Players").LocalPlayer!.GetMouse();
        const camera = game.GetService("Workspace").CurrentCamera;

        if (!camera) return;

        const viewportSize = camera.ViewportSize;
        const [topLeftInset] = game.GetService("GuiService").GetGuiInset();

        let xPos = mouse.X + 15;
        let yPos = mouse.Y + 15;

        // Adjust X position if tooltip would go offscreen
        if (xPos + tooltipWidth > viewportSize.X) {
            xPos = math.max(0, mouse.X - tooltipWidth - 15);
        }

        // Adjust Y position if tooltip would go offscreen
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

    const isActiveAbility = ability.type === AbilityType.Active;

    // Format dice information for display
    const diceInfo = ability.dices.size() > 0
        ? `${ability.dices.size()}d${ability.dices[0]}`
        : "No dice";

    // Get damage types and potencies for active abilities
    const getDamageTypeInfo = () => {
        if (isActiveAbility) {
            const activeAbility = ability as ActiveAbilityConfig;
            if (activeAbility.damageType) {
                const types: string[] = [];
                activeAbility.damageType.forEach((value, key) => {
                    if (value > 0) {
                        types.push(`${key} (${value})`);
                    }
                });
                return types.join(", ") || "None";
            }
        }
        return "N/A";
    };

    const getPotencyInfo = () => {
        if (isActiveAbility) {
            const activeAbility = ability as ActiveAbilityConfig;
            if (activeAbility.potencies) {
                const potencies: string[] = [];
                activeAbility.potencies.forEach((value, key) => {
                    if (value > 0) {
                        potencies.push(`${key} (${value})`);
                    }
                });
                return potencies.join(", ") || "None";
            }
        }
        return "N/A";
    };

    // Get range info for active abilities
    const getRangeInfo = () => {
        if (isActiveAbility) {
            const activeAbility = ability as ActiveAbilityConfig;
            if (activeAbility.range) {
                return `${activeAbility.range.Min}-${activeAbility.range.Max}`;
            }
        }
        return "N/A";
    };

    // Format cost information
    const costInfo = `${ability.cost.pos} POS / ${ability.cost.mana} Mana`;

    // UI Constants
    const UI_COLORS = {
        BACKGROUND: new Color3(0, 0, 0),
        TEXT_PRIMARY: new Color3(1, 1, 1),
        TEXT_SECONDARY: new Color3(0.8, 0.8, 0.8),
        TEXT_HIGHLIGHT: new Color3(1, 0.8, 0.2),
        DIVIDER: new Color3(0.3, 0.3, 0.3),
        HEADER: new Color3(0.7, 0.7, 1),
        COST_LABEL: new Color3(1, 0.4, 0.4),
        RANGE_LABEL: new Color3(0.4, 0.7, 1),
        DICE_LABEL: new Color3(1, 0.8, 0.4),
        DIRECTION_LABEL: new Color3(0.4, 1, 0.4),
        DAMAGE_LABEL: new Color3(1, 0.5, 0.5),
        POTENCY_LABEL: new Color3(0.5, 0.5, 1),
        BORDER: new Color3(1, 1, 1)
    };

    const TOOLTIP_STYLE = {
        SIZE: UDim2.fromOffset(tooltipWidth, tooltipHeight),
        POSITION: UDim2.fromOffset(tooltipPosition.X, tooltipPosition.Y),
        BACKGROUND_COLOR: UI_COLORS.BACKGROUND,
        BACKGROUND_TRANSPARENCY: 0.2,
        BORDER_SIZE_PIXEL: 0,
        Z_INDEX: 100
    };

    const TOOLTIP_PADDING = {
        PADDING_LEFT: new UDim(0, 10),
        PADDING_RIGHT: new UDim(0, 10),
        PADDING_TOP: new UDim(0, 10),
        PADDING_BOTTOM: new UDim(0, 10)
    };

    const TOOLTIP_LAYOUT = {
        SORT_ORDER: Enum.SortOrder.LayoutOrder,
        PADDING: new UDim(0, 5)
    };

    const TEXT_STYLES = {
        TITLE: {
            SIZE: UDim2.fromScale(1, 0.1),
            TEXT_COLOR: UI_COLORS.TEXT_PRIMARY,
            TEXT_SIZE: 16,
            FONT: Enum.Font.SourceSansBold,
            ALIGNMENT: Enum.TextXAlignment.Left,
            LAYOUT_ORDER: 0
        },
        DESCRIPTION: {
            SIZE: UDim2.fromScale(1, 0.25),
            TEXT_COLOR: UI_COLORS.TEXT_PRIMARY,
            TEXT_SIZE: 12,
            FONT: Enum.Font.SourceSans,
            ALIGNMENT: Enum.TextXAlignment.Left,
            TEXT_WRAPPED: true,
            LAYOUT_ORDER: 2
        },
        HEADER: {
            SIZE: UDim2.fromScale(1, 0.07),
            TEXT_COLOR: UI_COLORS.HEADER,
            TEXT_SIZE: 12,
            FONT: Enum.Font.SourceSansBold,
            ALIGNMENT: Enum.TextXAlignment.Center,
            LAYOUT_ORDER: 4
        },
        LABEL: {
            SIZE: UDim2.fromScale(0.3, 1),
            TEXT_SIZE: 12,
            FONT: Enum.Font.SourceSansBold,
            ALIGNMENT: Enum.TextXAlignment.Left
        },
        VALUE: {
            SIZE: UDim2.fromScale(0.7, 1),
            POSITION: UDim2.fromScale(0.3, 0),
            TEXT_COLOR: UI_COLORS.TEXT_PRIMARY,
            TEXT_SIZE: 12,
            FONT: Enum.Font.SourceSans,
            ALIGNMENT: Enum.TextXAlignment.Left
        }
    };

    // Layout element constants
    const titleElement = (
        <textlabel
            Text={ability.name}
            Size={TEXT_STYLES.TITLE.SIZE}
            BackgroundTransparency={1}
            TextColor3={TEXT_STYLES.TITLE.TEXT_COLOR}
            TextSize={TEXT_STYLES.TITLE.TEXT_SIZE}
            Font={TEXT_STYLES.TITLE.FONT}
            TextXAlignment={TEXT_STYLES.TITLE.ALIGNMENT}
            LayoutOrder={TEXT_STYLES.TITLE.LAYOUT_ORDER}
        />
    );

    const typeAndKeyElement = (
        <frame
            Size={UDim2.fromScale(1, 0.05)}
            BackgroundTransparency={1}
            LayoutOrder={1}
        >
            <textlabel
                Text={`Type: ${ability.type}`}
                Size={UDim2.fromScale(0.5, 1)}
                Position={UDim2.fromScale(0, 0)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.TEXT_SECONDARY}
                TextSize={12}
                Font={Enum.Font.SourceSans}
                TextXAlignment={Enum.TextXAlignment.Left}
            />

            <textlabel
                Text={`Key: ${abKey}`}
                Size={UDim2.fromScale(0.5, 1)}
                Position={UDim2.fromScale(0.5, 0)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.TEXT_HIGHLIGHT}
                TextSize={12}
                Font={Enum.Font.SourceSansBold}
                TextXAlignment={Enum.TextXAlignment.Right}
            />
        </frame>
    );

    const descriptionElement = (
        <textlabel
            Text={ability.description || "No description available"}
            Size={TEXT_STYLES.DESCRIPTION.SIZE}
            BackgroundTransparency={1}
            TextColor3={TEXT_STYLES.DESCRIPTION.TEXT_COLOR}
            TextSize={TEXT_STYLES.DESCRIPTION.TEXT_SIZE}
            TextWrapped={TEXT_STYLES.DESCRIPTION.TEXT_WRAPPED}
            Font={TEXT_STYLES.DESCRIPTION.FONT}
            TextXAlignment={TEXT_STYLES.DESCRIPTION.ALIGNMENT}
            TextYAlignment={Enum.TextYAlignment.Top}
            LayoutOrder={TEXT_STYLES.DESCRIPTION.LAYOUT_ORDER}
        />
    );

    const dividerElement = (
        <frame
            Size={UDim2.fromScale(1, 0.01)}
            BorderSizePixel={0}
            BackgroundColor3={UI_COLORS.DIVIDER}
            BackgroundTransparency={0.5}
            LayoutOrder={3}
        />
    );

    const headerElement = (
        <textlabel
            Text="TACTICAL INFO"
            Size={TEXT_STYLES.HEADER.SIZE}
            BackgroundTransparency={1}
            TextColor3={TEXT_STYLES.HEADER.TEXT_COLOR}
            TextSize={TEXT_STYLES.HEADER.TEXT_SIZE}
            Font={TEXT_STYLES.HEADER.FONT}
            TextXAlignment={TEXT_STYLES.HEADER.ALIGNMENT}
            LayoutOrder={TEXT_STYLES.HEADER.LAYOUT_ORDER}
        />
    );

    const createInfoRow = (
        label: string,
        value: string,
        layoutOrder: number,
        labelColor: Color3
    ) => (
        <frame
            Size={UDim2.fromScale(1, 0.05)}
            BackgroundTransparency={1}
            LayoutOrder={layoutOrder}
        >
            <textlabel
                Text={label}
                Size={TEXT_STYLES.LABEL.SIZE}
                Position={UDim2.fromScale(0, 0)}
                BackgroundTransparency={1}
                TextColor3={labelColor}
                TextSize={TEXT_STYLES.LABEL.TEXT_SIZE}
                Font={TEXT_STYLES.LABEL.FONT}
                TextXAlignment={TEXT_STYLES.LABEL.ALIGNMENT}
            />

            <textlabel
                Text={value}
                Size={TEXT_STYLES.VALUE.SIZE}
                Position={TEXT_STYLES.VALUE.POSITION}
                BackgroundTransparency={1}
                TextColor3={TEXT_STYLES.VALUE.TEXT_COLOR}
                TextSize={TEXT_STYLES.VALUE.TEXT_SIZE}
                Font={TEXT_STYLES.VALUE.FONT}
                TextXAlignment={TEXT_STYLES.VALUE.ALIGNMENT}
            />
        </frame>
    );

    const costRow = createInfoRow("Cost:", costInfo, 5, UI_COLORS.COST_LABEL);
    const rangeRow = createInfoRow("Range:", getRangeInfo(), 6, UI_COLORS.RANGE_LABEL);
    const diceRow = createInfoRow("Dice:", diceInfo, 7, UI_COLORS.DICE_LABEL);
    const directionRow = createInfoRow("Direction:", ability.direction, 8, UI_COLORS.DIRECTION_LABEL);

    const damageAndPotencyElement = isActiveAbility ? (
        <frame
            Size={UDim2.fromScale(1, 0.1)}
            BackgroundTransparency={1}
            LayoutOrder={9}
        >
            <textlabel
                Text="Damage Type:"
                Size={UDim2.fromScale(0.3, 0.5)}
                Position={UDim2.fromScale(0, 0)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.DAMAGE_LABEL}
                TextSize={12}
                Font={Enum.Font.SourceSansBold}
                TextXAlignment={Enum.TextXAlignment.Left}
            />

            <textlabel
                Text={getDamageTypeInfo()}
                Size={UDim2.fromScale(0.7, 0.5)}
                Position={UDim2.fromScale(0.3, 0)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.TEXT_PRIMARY}
                TextSize={12}
                TextWrapped={true}
                Font={Enum.Font.SourceSans}
                TextXAlignment={Enum.TextXAlignment.Left}
            />

            <textlabel
                Text="Potency:"
                Size={UDim2.fromScale(0.3, 0.5)}
                Position={UDim2.fromScale(0, 0.5)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.POTENCY_LABEL}
                TextSize={12}
                Font={Enum.Font.SourceSansBold}
                TextXAlignment={Enum.TextXAlignment.Left}
            />

            <textlabel
                Text={getPotencyInfo()}
                Size={UDim2.fromScale(0.7, 0.5)}
                Position={UDim2.fromScale(0.3, 0.5)}
                BackgroundTransparency={1}
                TextColor3={UI_COLORS.TEXT_PRIMARY}
                TextSize={12}
                TextWrapped={true}
                Font={Enum.Font.SourceSans}
                TextXAlignment={Enum.TextXAlignment.Left}
            />
        </frame>
    ) : undefined;

    return (
        <>
            <imagebutton
                Size={UDim2.fromScale(isFocused ? 0.25 : 0.2, 1)}
                Image={ability.icon}
                SizeConstraint={"RelativeXX"}
                Event={{
                    MouseButton1Click: activateAbility,
                    MouseEnter: handleMouseEnter,
                    MouseLeave: () => setIsHovering(false),
                    MouseMoved: handleMouseMove
                }}
            >
                <uiaspectratioconstraint AspectRatio={1} />
            </imagebutton>

            {isHovering && (
                <screengui
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    DisplayOrder={10}
                    IgnoreGuiInset={true}
                >
                    <frame
                        Size={TOOLTIP_STYLE.SIZE}
                        Position={TOOLTIP_STYLE.POSITION}
                        BackgroundColor3={TOOLTIP_STYLE.BACKGROUND_COLOR}
                        BackgroundTransparency={TOOLTIP_STYLE.BACKGROUND_TRANSPARENCY}
                        BorderSizePixel={TOOLTIP_STYLE.BORDER_SIZE_PIXEL}
                        ZIndex={TOOLTIP_STYLE.Z_INDEX}
                    >
                        <uicorner CornerRadius={new UDim(0, 6)} />
                        <uistroke Color={UI_COLORS.BORDER} Transparency={0.7} Thickness={1} />
                        <uipadding
                            PaddingLeft={TOOLTIP_PADDING.PADDING_LEFT}
                            PaddingRight={TOOLTIP_PADDING.PADDING_RIGHT}
                            PaddingTop={TOOLTIP_PADDING.PADDING_TOP}
                            PaddingBottom={TOOLTIP_PADDING.PADDING_BOTTOM}
                        />
                        <uilistlayout
                            SortOrder={TOOLTIP_LAYOUT.SORT_ORDER}
                            Padding={TOOLTIP_LAYOUT.PADDING}
                        />
                        {titleElement}
                        {typeAndKeyElement}
                        {descriptionElement}
                        {dividerElement}
                        {headerElement}
                        {costRow}
                        {rangeRow}
                        {diceRow}
                        {directionRow}
                        {damageAndPotencyElement}
                    </frame>
                </screengui>
            )}
        </>
    );
}

export default AbilitySlot;
