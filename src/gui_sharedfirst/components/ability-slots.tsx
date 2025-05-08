import React, { Element, ReactComponent } from "@rbxts/react";
import BattleGui from "shared/class/battle/Client/Gui";
import Entity from "shared/class/battle/State/Entity";
import { AbilitySet } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import Ability1SlotElement from "./ability-1slot";

interface AbilitySlotsElementProps {
    cre: Entity;
    abilitySet: AbilitySet;
    gui: BattleGui;
}
interface AbilitySlotsElementState { }
@ReactComponent
export default class AbilitySlotsElement extends React.Component<AbilitySlotsElementProps, AbilitySlotsElementState> {
    constructor(props: AbilitySlotsElementProps) {
        super(props);
    }

    render() {
        const abilitySet = this.props.abilitySet;
        const abilityButtons: (Element | undefined)[] = [
            abilitySet['Q'] ? <Ability1SlotElement cre={this.props.cre} abKey={'Q'} ability={abilitySet['Q']} focus={false} /> : undefined,
            abilitySet['W'] ? <Ability1SlotElement cre={this.props.cre} abKey={'W'} ability={abilitySet['W']} focus={false} /> : undefined,
            abilitySet['E'] ? <Ability1SlotElement cre={this.props.cre} abKey={'E'} ability={abilitySet['E']} focus={false} /> : undefined,
            abilitySet['R'] ? <Ability1SlotElement cre={this.props.cre} abKey={'R'} ability={abilitySet['R']} focus={false} /> : undefined
        ];


        return (<>{abilityButtons}</>);
    }
}