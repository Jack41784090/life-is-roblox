
import Roact, { Element } from "@rbxts/roact";
import { Battle } from "shared/class/battle/Battle";
import Entity from "shared/class/battle/system/Entity";
import { AbilitySet } from "shared/types/battle-types";
import Ability1SlotElement from "./ability-1slot";

interface AbilitySlotsElementProps {
    cre: Entity;
    abilitySet: AbilitySet;
    gui: Battle.Gui;
}
interface AbilitySlotsElementState { }
export default class AbilitySlotsElement extends Roact.Component<AbilitySlotsElementProps, AbilitySlotsElementState> {
    constructor(props: AbilitySlotsElementProps) {
        super(props);
    }

    render() {
        const abilitySet = this.props.abilitySet;
        const abilityButtons: (Element | undefined)[] = [
            abilitySet['Q'] ? <Ability1SlotElement cre={this.props.cre} key={'Q'} ability={abilitySet['Q']} focus={false} /> : undefined,
            abilitySet['W'] ? <Ability1SlotElement cre={this.props.cre} key={'W'} ability={abilitySet['W']} focus={false} /> : undefined,
            abilitySet['E'] ? <Ability1SlotElement cre={this.props.cre} key={'E'} ability={abilitySet['E']} focus={false} /> : undefined,
            abilitySet['R'] ? <Ability1SlotElement cre={this.props.cre} key={'R'} ability={abilitySet['R']} focus={false} /> : undefined
        ];


        return (<>{abilityButtons}</>);
    }
}