
import React, { ReactComponent } from "@rbxts/react";
import { createPortal } from "@rbxts/react-roblox";

interface OPTElementProps { }
interface OPTElementState { }
@ReactComponent
export default class OPTElement extends React.Component<OPTElementProps, OPTElementState> {
    constructor(props: OPTElementProps) {
        super(props);
    }

    render() {
        const pgui = game.GetService("Players").LocalPlayer?.FindFirstChild("PlayerGui");
        if (!pgui) {
            return undefined;
        }
        return (
            createPortal(
                <screengui key={'otherPlayersTurnGui'}>
                    <frame
                        BackgroundColor3={BrickColor.Red().Color}
                        BackgroundTransparency={.9}
                        Size={UDim2.fromScale(1, 1)}
                    >
                        <textlabel
                            Position={UDim2.fromScale(.5, .25)}
                            AnchorPoint={new Vector2(.5, .5)}
                            Size={UDim2.fromScale(.5, .2)}
                            Text={'Other Players Turn'}
                        />
                    </frame>
                </screengui>, pgui)
        )
    }
}