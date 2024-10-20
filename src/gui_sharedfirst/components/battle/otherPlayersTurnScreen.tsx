
import Roact from "@rbxts/roact";

interface OPTElementProps { }
interface OPTElementState { }
export default class OPTElement extends Roact.Component<OPTElementProps, OPTElementState> {
    constructor(props: OPTElementProps) {
        super(props);
    }

    render() {
        const pgui = game.GetService("Players").LocalPlayer?.FindFirstChild("PlayerGui");
        if (!pgui) {
            return undefined;
        }
        return (
            <Roact.Portal target={pgui}>
                <screengui Key={'otherPlayersTurnGui'}>
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
                </screengui>
            </Roact.Portal>
        )
    }
}