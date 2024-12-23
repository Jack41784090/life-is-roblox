
import React, { ReactComponent } from "@rbxts/react";
import Entity from "shared/class/battle/Entity";
import { iAbility } from "shared/types/battle-types";
import { onInput } from "shared/utils";

interface Ability1SlotElementProps {
    cre: Entity;
    key: keyof typeof Enum.KeyCode;
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
        this.setState({ focus: this.props.focus });
        this.onKeyClickScript = onInput(Enum.UserInputType.Keyboard, (input: InputObject) => {
            if (input.KeyCode.Name === this.props.key) {
                this.setState({ focus: true });
                const cre = this.props.cre;
                // if (!cre.cell) return;
                this.glowUpRange(this.props.ability.range);
                cre.armed = this.props.key;
            }
            else if (this.state.focus) {
                this.setState({ focus: false });
            }
        });
    }

    glowUpRange(range: NumberRange) {
        const cre = this.props.cre;
        // if (!cre.cell) return;
        // const cells = cre.cell.findCellsWithinRange(range);
        // const event = bindableEventsMap["GlowUpCells"] as BindableEvent;
        // if (event) {
        //     event.Fire(cells.map(c => c.qr()));
        // }
    }

    protected willUnmount(): void {
        this.onKeyClickScript.Disconnect();
    }

    render() {
        const ability = this.props.ability;
        const key = this.props.key;
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
