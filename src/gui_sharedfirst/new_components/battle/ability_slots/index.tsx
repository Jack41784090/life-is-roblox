import React from '@rbxts/react';
import BattleGui from 'shared/class/battle/Client/Gui';
import Entity from 'shared/class/battle/State/Entity/index';
import { AbilitySet } from 'shared/class/battle/Systems/CombatSystem/Ability/types';
import AbilitySlot from './ability_slot';


interface AbilitySlotsProps {
    cre: Entity;
    abilitySet: AbilitySet;
    gui: BattleGui;
}

export function AbilitySlots({ cre, abilitySet, gui }: AbilitySlotsProps) {
    const abilityKeys = ['Q', 'W', 'E', 'R'] as const;

    return (
        <>
            {abilityKeys.map((key) =>
                abilitySet[key] ?
                    <AbilitySlot
                        key={`ability-${key}`}
                        cre={cre}
                        abKey={key}
                        ability={abilitySet[key]!}
                        focus={false}
                    /> :
                    undefined
            )}
        </>
    );
}

export default AbilitySlots;
