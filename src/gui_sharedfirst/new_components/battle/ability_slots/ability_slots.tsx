import React from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { AbilitySet } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { AbilitySlot } from "./ability_slot";

interface AbilitySlotsProps {
    cre: Entity;
    abilitySet: AbilitySet;
}

export function AbilitySlots({ cre, abilitySet }: AbilitySlotsProps) {
    const abilityKeys = ['Q', 'W', 'E', 'R'] as const;

    const renderAbilitySlot = (key: typeof abilityKeys[number]) => {
        const ability = abilitySet[key];
        return ability
            ? <AbilitySlot key={`ability-${key}`} cre={cre} abKey={key} ability={ability} focus={false} />
            : undefined;
    };

    return (
        <>
            {abilityKeys.map(renderAbilitySlot)}
        </>
    );
}

export default AbilitySlots;
