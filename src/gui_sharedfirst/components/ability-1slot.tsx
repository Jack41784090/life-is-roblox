
import React, { ReactComponent } from "@rbxts/react";
import Entity from "shared/class/battle/Entity";
import { iAbility } from "shared/types/battle-types";
import { onInput } from "shared/utils";

interface Ability1SlotElementProps {
    cre: Entity;
    abKey: keyof typeof Enum.KeyCode;
    ability: iAbility;
    focus: boolean;
}
interface Ability1SlotElementState {
    focus: boolean;
}
@ReactComponent
export default class Ability1SlotElement extends React.Component<Ability1SlotElementProps, Ability1SlotElementState> {
    onKeyClickScript: RBXScriptConnection;

    constructor(props: Ability1SlotElementProps) {
        super(props);
        print(props);
        this.setState({ focus: this.props.focus });
        this.onKeyClickScript = onInput(Enum.UserInputType.Keyboard, (input: InputObject) => {
            // print(input.KeyCode.Name, this.props.key, input.KeyCode.Name === this.props.key);
            if (input.KeyCode.Name === this.props.abKey) {
                print(`clicked ${this.props.abKey}`);
                this.setState({ focus: true });
                const cre = this.props.cre;
                cre.armed = this.props.abKey;
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
        const key = this.props.abKey;
        return (
            <imagebutton
                key={`${key}-${ability.name}`}
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
