import { EntityStance } from "../../../State/Entity/types";
import { AbilityType, ActiveAbilityConfig, DamageType, Potency } from "./types";

export const TEST_ABILITIES = new Map<string, ActiveAbilityConfig>([
    ['simple-test', {
        type: AbilityType.Active,
        icon: 'rbxassetid://test-icon',
        animation: 'test-swing',
        name: 'Simple Test',
        description: 'A basic test ability to verify the new triggerMap system',
        direction: EntityStance.Mid,
        dices: [4],
        potencies: new Map<Potency, number>([
            [Potency.Strike, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Crush, 1]
        ]),
        cost: {
            pos: 5,
            mana: 0,
        },
        range: new NumberRange(1, 1),
        triggerMap: {
            beforeAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'str',
                    value: 1
                }
            ]
        }
    }]
]);
