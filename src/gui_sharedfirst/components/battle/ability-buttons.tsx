
import Roact, { Element } from "@rbxts/roact";
import BattleGUI from "shared/class/BattleGui";
import { AbilitySet } from "shared/types/battle-types";
import Ability1SlotElement from "./ability-1slot";

interface AbilitySlotsElementProps {
    abilitySet: AbilitySet;
    gui: BattleGUI;
}
interface AbilitySlotsElementState { }
export default class AbilitySlotsElement extends Roact.Component<AbilitySlotsElementProps, AbilitySlotsElementState> {
    constructor(props: AbilitySlotsElementProps) {
        super(props);
    }

    render() {
        const abilitySet = this.props.abilitySet;
        const abilityButtons: (Element | undefined)[] = [
            abilitySet['Q'] ? <Ability1SlotElement gui={this.props.gui} key={'Q'} ability={abilitySet['Q']} focus={false} /> : undefined,
            abilitySet['W'] ? <Ability1SlotElement gui={this.props.gui} key={'W'} ability={abilitySet['W']} focus={false} /> : undefined,
            abilitySet['E'] ? <Ability1SlotElement gui={this.props.gui} key={'W'} ability={abilitySet['E']} focus={false} /> : undefined,
            abilitySet['R'] ? <Ability1SlotElement gui={this.props.gui} key={'W'} ability={abilitySet['R']} focus={false} /> : undefined
        ];


        return (<>{abilityButtons}</>);
    }
}