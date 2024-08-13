import Roact from "@rbxts/roact";
import { getPlayer } from "shared/func";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

interface MenuFrameElementProps { }
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
                    Key={"Menu"}
                    ResetOnSpawn={false}
                    ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
                >
                    <frame
                        Key={"MenuFrame"}
                        Size={new UDim2(1, 0, 1, 0)}
                        BackgroundTransparency={1}
                    >
                        {this.props[Roact.Children]}
                    </frame>
                </screengui>
            </Roact.Portal>
        );
    }
}

export = MenuFrameElement