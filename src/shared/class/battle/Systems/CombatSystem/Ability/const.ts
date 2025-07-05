import { EntityStance, EntityStats } from "../../../State/Entity/types";
import { AbilityType, ActiveAbilityConfig, DamageType, Potency } from "./types";

export const UNIVERSAL_PHYS = new Map<string, ActiveAbilityConfig>([
    ['4-Slash-Combo', {
        type: AbilityType.Active,
        icon: 'rbxassetid://115770864932653',
        animation: 'swing',
        name: 'Slash',
        description: 'slashing',
        direction: EntityStance.High,
        dices: [4, 4, 4, 4],
        potencies: new Map<Potency, number>([
            [Potency.Slash, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Cut, 1]
        ]),
        cost: {
            pos: 10,
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
            ],
            afterStrikeSequence: (context) => [
                {
                    targeting: 'defender',
                    mod: 'pos',
                    value: -3
                }
            ]
        }
    }]
])

export const potencyMap: Record<Potency, [keyof EntityStats, number][]> = {
    [Potency.Strike]: [
        ['str', 1]
    ],
    [Potency.Slash]: [
        ['str', 1]
    ],
    [Potency.Stab]: [
        ['str', 1]
    ],
    [Potency.TheWay]: [
        ['fai', 1.1]
    ],
    [Potency.Light]: [
        ['fai', .4],
        ['wil', .6],
    ],
    [Potency.Dark]: [
        ['cha', .25],
        ['wil', .75],
    ],
    [Potency.Arcane]: [
        ['int', .85],
        ['wil', .15],
    ],
    [Potency.Elemental]: [
        ['int', .65],
        ['spr', .35],
    ],
    [Potency.Occult]: [
        ['wil', .1],
        ['spr', .4],
        ['cha', .5],
    ],
    [Potency.Spiritual]: [
        ['spr', .9],
        ['wil', .1],
    ],
}