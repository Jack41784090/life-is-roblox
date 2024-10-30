import React, { ReactComponent } from "@rbxts/react";
import { createPortal } from "@rbxts/react-roblox";
import { getPlayer } from "shared/utils";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

interface AbilitySetElementProps {
    transparency?: number;
    backgroundColour?: Color3;
    frameKey?: string;
}
interface AbilitySetElementState {
    colour: Color3;
}
@ReactComponent
export default class AbilitySetElement extends React.Component<AbilitySetElementProps, AbilitySetElementState> {
    constructor(props: AbilitySetElementProps) {
        super(props);
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }

        return (
            createPortal(
                <screengui
                    key={"AbilitySetScreenGui"}
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    IgnoreGuiInset={true}
                >
                    <imagelabel
                        key={this.props.frameKey || "AbilitySet"}
                        AnchorPoint={new Vector2(1, 1)}
                        Size={UDim2.fromScale(0.3, 0)}
                        Position={UDim2.fromScale(1, 1)}
                    >
                        <uiaspectratioconstraint
                            AspectRatio={4.25}
                            AspectType={"ScaleWithParentSize"}
                            DominantAxis={'Width'}
                        />
                        <uilistlayout
                            FillDirection={'Horizontal'}
                            SortOrder={'LayoutOrder'}
                            HorizontalAlignment={'Center'}
                            VerticalAlignment={'Center'}
                            HorizontalFlex={'SpaceAround'}
                        />
                        <uipadding PaddingBottom={new UDim(0.3)} />
                        {this.props.children}
                    </imagelabel>
                </screengui>, playerGUI)
        );
    }
}
