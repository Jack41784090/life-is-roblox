import Roact from "@rbxts/roact";
import { getPlayer } from "shared/func";

const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");

interface MenuFrameElementProps { }
interface MenuFrameElementState { }
export default class ButtonFrameElement extends Roact.Component<MenuFrameElementProps, MenuFrameElementState> {
    constructor(props: MenuFrameElementProps) {
        super(props);
    }

    render() {
        if (!playerGUI) {
            return undefined;
        }

        return (
            <frame
                Key={"ButtonFrame"}
                Position={new UDim2(0.3, 0, 0.35, 0)}
                Size={new UDim2(0.4, 0, 0.6, 0)}
                BackgroundTransparency={0.25}
                BackgroundColor3={new Color3(1, 1, 1)}
                BorderColor3={new Color3(0, 0, 0)}
                BorderSizePixel={2}
            >
                {this.props[Roact.Children]}
            </frame>
        );
    }
}
