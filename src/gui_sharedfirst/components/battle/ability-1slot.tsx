
import Roact from "@rbxts/roact";
import { onInput } from "shared/utils";

interface Ability1SlotElementProps {
    key: keyof typeof Enum.KeyCode;
    name: string;
    focus: boolean;
}
interface Ability1SlotElementState {
    focus: boolean;
}
export default class Ability1SlotElement extends Roact.Component<Ability1SlotElementProps, Ability1SlotElementState> {
    onKeyClickScript: RBXScriptConnection;

    constructor(props: Ability1SlotElementProps) {
        super(props);
        this.setState({ focus: this.props.focus });
        this.onKeyClickScript = onInput(Enum.UserInputType.Keyboard, (input: InputObject) => {
            if (input.KeyCode.Name === this.props.key) {
                print("Key pressed: " + this.props.key);
                this.setState({ focus: true });
            }
            else if (this.state.focus) {
                print("Key released: " + this.props.key);
                this.setState({ focus: false });
            }
        });
    }

    protected willUnmount(): void {
        this.onKeyClickScript.Disconnect();
    }


    render() {
        print("Rendering " + this.props.name);
        return (
            <imagebutton
                Key={this.props.name}
                Size={UDim2.fromScale(this.state.focus ? 0.25 : 0.2, 1)}
                SizeConstraint={'RelativeXX'}
                Event={{
                    MouseButton1Click: () => {

                    }
                }}
            >
                <uiaspectratioconstraint AspectRatio={1} />
            </imagebutton>
        );
    }
}
