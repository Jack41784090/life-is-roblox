
import Roact from "@rbxts/roact";
import BattleGUI from "shared/class/BattleGui";
import { iAbility } from "shared/types/battle-types";
import { onInput } from "shared/utils";

interface Ability1SlotElementProps {
    gui: BattleGUI;
    key: keyof typeof Enum.KeyCode;
    ability: iAbility;
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
            const gui = this.props.gui;
            if (input.KeyCode.Name === this.props.key) {
                this.setState({ focus: true });
                const cre = gui.getBattle().getCurrentRoundEntity();
                if (cre?.cell) {
                    gui.mountOrUpdateGlowRange(cre.cell, this.props.ability.range);
                }
            }
            else if (this.state.focus) {
                this.setState({ focus: false });
            }
        });
    }

    protected willUnmount(): void {
        this.onKeyClickScript.Disconnect();
    }


    render() {
        const ability = this.props.ability;
        const key = this.props.key;
        print("Rendering " + ability.name);
        return (
            <imagebutton
                Key={`${key}-${ability.name}`}
                Size={UDim2.fromScale(this.state.focus ? 0.25 : 0.2, 1)}
                Image={ability.icon}
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
