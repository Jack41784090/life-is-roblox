import React, { ReactComponent } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import Logger from "shared/utils/Logger";

interface FightingStyleSelectorProps {
    entity: Entity;
    onStyleSelect?: (styleIndex: number) => void;
}

interface FightingStyleSelectorState {
    styles: FightingStyleState[];
    activeStyleIndex: number;
}

const logger = Logger.createContextLogger("FightingStyleSelector");

@ReactComponent
export default class FightingStyleSelector extends React.Component<FightingStyleSelectorProps, FightingStyleSelectorState> {
    constructor(props: FightingStyleSelectorProps) {
        super(props);

        const entityState = this.props.entity.state();

        this.setState({
            styles: entityState.fightingStyles,
            activeStyleIndex: entityState.activeStyleIndex,
        });
    }

    private handleStyleSelect(styleIndex: number): void {
        if (this.props.entity.switchFightingStyle(styleIndex)) {
            this.setState({
                activeStyleIndex: styleIndex,
            });

            if (this.props.onStyleSelect) {
                this.props.onStyleSelect(styleIndex);
            }
        }
    }

    private renderPassiveEffects(style: FightingStyleState): React.Element {
        return (
            <frame
                Size={new UDim2(1, 0, 0, 60)}
                BackgroundTransparency={1}
                LayoutOrder={2}
            >
                <uipadding
                    PaddingLeft={new UDim(0, 5)}
                    PaddingRight={new UDim(0, 5)}
                />
                <uilistlayout
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 5)}
                />
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(0.9, 0.9, 0.9)}
                    Font={Enum.Font.GothamBold}
                    TextSize={14}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    Text="Passive Effects:"
                    LayoutOrder={0}
                />
                {style.passiveEffects.map((effect, i) => (
                    <textlabel
                        key={`effect-${i}`}
                        Size={new UDim2(1, 0, 0, 16)}
                        BackgroundTransparency={1}
                        TextColor3={new Color3(0.8, 0.8, 1)}
                        Font={Enum.Font.Gotham}
                        TextSize={12}
                        TextXAlignment={Enum.TextXAlignment.Left}
                        Text={`• ${effect.description}`}
                        LayoutOrder={i + 1}
                    />
                ))}
            </frame>
        );
    }

    private renderAbilities(style: FightingStyleState): React.Element {
        return (
            <frame
                Size={new UDim2(1, 0, 0, 60)}
                BackgroundTransparency={1}
                LayoutOrder={3}
            >
                <uipadding
                    PaddingLeft={new UDim(0, 5)}
                    PaddingRight={new UDim(0, 5)}
                />
                <uilistlayout
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 5)}
                />
                <textlabel
                    Size={new UDim2(1, 0, 0, 20)}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(0.9, 0.9, 0.9)}
                    Font={Enum.Font.GothamBold}
                    TextSize={14}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    Text="Abilities:"
                    LayoutOrder={0}
                />
                <frame
                    Size={new UDim2(1, 0, 0, 30)}
                    BackgroundTransparency={1}
                    LayoutOrder={1}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Horizontal}
                        HorizontalAlignment={Enum.HorizontalAlignment.Left}
                        Padding={new UDim(0, 10)}
                        SortOrder={Enum.SortOrder.LayoutOrder}
                    />
                    {style.availableAbilities.map((ability, i) => (
                        <frame
                            key={`ability-${i}`}
                            Size={new UDim2(0, 30, 0, 30)}
                            BackgroundColor3={new Color3(0.2, 0.6, 0.9)}
                            BorderSizePixel={0}
                            LayoutOrder={i}
                        >
                            <uicorner CornerRadius={new UDim(0, 5)} />
                            <textlabel
                                Size={new UDim2(1, 0, 1, 0)}
                                BackgroundTransparency={1}
                                TextColor3={new Color3(1, 1, 1)}
                                Font={Enum.Font.GothamBold}
                                TextSize={14}
                                Text={ability.sub(0, 1)}
                            />
                        </frame>
                    ))}
                </frame>
            </frame>
        );
    }

    render(): React.Element {
        return (
            <frame
                Size={new UDim2(0, 250, 0, 300)}
                Position={new UDim2(0.01, 0, 0.2, 0)}
                BackgroundColor3={new Color3(0.1, 0.1, 0.12)}
                BorderSizePixel={0}
                ClipsDescendants={true}
            >
                <uicorner CornerRadius={new UDim(0, 8)} />
                <uistroke
                    Color={new Color3(0.2, 0.6, 0.9)}
                    Thickness={1}
                />
                <uipadding
                    PaddingTop={new UDim(0, 10)}
                    PaddingBottom={new UDim(0, 10)}
                />
                <uilistlayout
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    Padding={new UDim(0, 10)}
                />
                <textlabel
                    Size={new UDim2(1, 0, 0, 25)}
                    BackgroundTransparency={1}
                    TextColor3={new Color3(1, 1, 1)}
                    Font={Enum.Font.GothamBold}
                    TextSize={18}
                    Text="Fighting Styles"
                    LayoutOrder={0}
                />

                <scrollingframe
                    Size={new UDim2(1, 0, 1, -35)}
                    CanvasSize={new UDim2(0, 0, 0, this.state.styles.size() * 170)}
                    BackgroundTransparency={1}
                    ScrollBarThickness={4}
                    BorderSizePixel={0}
                    LayoutOrder={1}
                >
                    <uilistlayout
                        SortOrder={Enum.SortOrder.LayoutOrder}
                        Padding={new UDim(0, 10)}
                    />
                    {this.state.styles.map((style, index) => (
                        <frame
                            key={`style-${index}`}
                            Size={new UDim2(1, -20, 0, 160)}
                            Position={new UDim2(0.5, 0, 0, 0)}
                            AnchorPoint={new Vector2(0.5, 0)}
                            BackgroundColor3={
                                index === this.state.activeStyleIndex
                                    ? new Color3(0.2, 0.3, 0.4)
                                    : new Color3(0.15, 0.15, 0.18)
                            }
                            BorderSizePixel={0}
                            LayoutOrder={index}
                        >
                            <uicorner CornerRadius={new UDim(0, 6)} />
                            <uistroke
                                Color={
                                    index === this.state.activeStyleIndex
                                        ? new Color3(0.4, 0.8, 1)
                                        : new Color3(0.3, 0.3, 0.35)
                                }
                                Thickness={1}
                            />
                            <uilistlayout
                                SortOrder={Enum.SortOrder.LayoutOrder}
                                Padding={new UDim(0, 5)}
                            />
                            <frame
                                Size={new UDim2(1, 0, 0, 35)}
                                BackgroundTransparency={1}
                                LayoutOrder={0}
                            >
                                <textlabel
                                    Size={new UDim2(0.7, 0, 1, 0)}
                                    Position={new UDim2(0, 10, 0, 0)}
                                    BackgroundTransparency={1}
                                    TextColor3={new Color3(1, 1, 1)}
                                    Font={Enum.Font.GothamBold}
                                    TextSize={16}
                                    TextXAlignment={Enum.TextXAlignment.Left}
                                    Text={style.name}
                                />
                                <textbutton
                                    Size={new UDim2(0, 80, 0, 30)}
                                    Position={new UDim2(1, -10, 0.5, 0)}
                                    AnchorPoint={new Vector2(1, 0.5)}
                                    BackgroundColor3={
                                        index === this.state.activeStyleIndex
                                            ? new Color3(0.2, 0.6, 0.2)
                                            : new Color3(0.2, 0.4, 0.9)
                                    }
                                    BorderSizePixel={0}
                                    Font={Enum.Font.Gotham}
                                    TextSize={14}
                                    TextColor3={new Color3(1, 1, 1)}
                                    Text={index === this.state.activeStyleIndex ? "Active" : `Switch (${this.props.entity.getFightingStyles()[index].getSwitchCost()})`}
                                    Event={{
                                        MouseButton1Click: () => {
                                            if (index !== this.state.activeStyleIndex) {
                                                this.handleStyleSelect(index);
                                            }
                                        },
                                    }}
                                    Active={!(index === this.state.activeStyleIndex)}
                                >
                                    <uicorner CornerRadius={new UDim(0, 4)} />
                                </textbutton>
                            </frame>
                            <textlabel
                                Size={new UDim2(1, 0, 0, 30)}
                                BackgroundTransparency={1}
                                TextColor3={new Color3(0.8, 0.8, 0.8)}
                                Font={Enum.Font.Gotham}
                                TextSize={14}
                                TextXAlignment={Enum.TextXAlignment.Left}
                                TextYAlignment={Enum.TextYAlignment.Top}
                                Text={style.description}
                                TextWrapped={true}
                                LayoutOrder={1}
                                Position={new UDim2(0, 10, 0, 0)}
                            />

                            {this.renderPassiveEffects(style)}
                            {this.renderAbilities(style)}
                        </frame>
                    ))}
                </scrollingframe>
            </frame>
        );
    }
}
