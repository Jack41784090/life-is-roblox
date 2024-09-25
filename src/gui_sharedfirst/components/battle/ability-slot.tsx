import Roact from "@rbxts/roact";
import { getPlayer } from "shared/func";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

interface AbilitySetElementProps {
    transparency?: number;
    backgroundColour?: Color3;
    frameKey?: string;
}
interface AbilitySetElementState {
    colour: Color3;
}
export default class AbilitySetElement extends Roact.Component<AbilitySetElementProps, AbilitySetElementState> {
    constructor(props: AbilitySetElementProps) {
        super(props);
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }

        return (
            <Roact.Portal target={playerGUI}>
                <screengui
                    Key={"AbilitySetScreenGui"}
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    IgnoreGuiInset={true}
                >
                    <imagelabel
                        Key={this.props.frameKey || "AbilitySet"}
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
                        {this.props[Roact.Children]}
                    </imagelabel>
                </screengui>
            </Roact.Portal>
        );
    }
}
