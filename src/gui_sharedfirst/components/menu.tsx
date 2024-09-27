import Roact from "@rbxts/roact";
import { getPlayer } from "shared/utils";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

interface MenuFrameElementProps {
    transparency?: number;
    zIndex?: number;
    backgroundColour?: Color3;
    screenUIKey?: string;
    frameKey?: string;
}
interface MenuFrameElementState {
    colour: Color3;
}
class MenuFrameElement extends Roact.Component<MenuFrameElementProps, MenuFrameElementState> {
    constructor(props: MenuFrameElementProps) {
        super(props);
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }

        return (
            <Roact.Portal target={playerGUI}>
                <screengui
                    Key={this.props.screenUIKey || "MenuScreenGui"}
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                    IgnoreGuiInset={true}
                >
                    <frame
                        Key={this.props.frameKey || "MenuFrame"}
                        Size={new UDim2(1, 0, 1, 0)}
                        BackgroundColor3={this.props.backgroundColour ?? Color3.fromRGB(0, 0, 0)}
                        BackgroundTransparency={this.props.transparency === undefined ? 0.5 : this.props.transparency}
                        ZIndex={this.props.zIndex || 1}
                    >
                        {this.props[Roact.Children]}
                    </frame>
                </screengui>
            </Roact.Portal>
        );
    }
}

export = MenuFrameElement