
import Roact, { Element } from "@rbxts/roact";
import { AbilitySet } from "shared/types/battle-types";
import Ability1SlotElement from "./ability-1slot";

interface AbilitySlotsElementProps {
    abilitySet: AbilitySet;
}
interface AbilitySlotsElementState { }
export default class AbilitySlotsElement extends Roact.Component<AbilitySlotsElementProps, AbilitySlotsElementState> {
    constructor(props: AbilitySlotsElementProps) {
        super(props);
    }

    render() {
        const abilitySet = this.props.abilitySet;
        const abilityButtons: Element[] = [
            <Ability1SlotElement key={'Q'} name={`Q-${abilitySet['Q']?.name}`} focus={false} />,
            <Ability1SlotElement key={'W'} name={`W-${abilitySet['W']?.name}`} focus={false} />,
            <Ability1SlotElement key={'E'} name={`E-${abilitySet['E']?.name}`} focus={false} />,
            <Ability1SlotElement key={'R'} name={`R-${abilitySet['R']?.name}`} focus={false} />,
        ];


        return (
            <>
                {abilityButtons}
            </>
        );
    }
}