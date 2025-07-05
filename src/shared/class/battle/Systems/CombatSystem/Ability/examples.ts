import { EntityStance } from "../../../State/Entity/types";
import { AbilityType, ActiveAbilityConfig, DamageType, Potency } from "./types";

export const EXAMPLE_ABILITIES = new Map<string, ActiveAbilityConfig>([
    ['power-slash', {
        type: AbilityType.Active,
        icon: 'rbxassetid://115770864932653',
        animation: 'power-slash',
        name: 'Power Slash',
        description: 'A devastating slash that builds momentum and drains the enemy',
        direction: EntityStance.High,
        dices: [6, 6],
        potencies: new Map<Potency, number>([
            [Potency.Slash, 2]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Cut, 2]
        ]),
        cost: {
            pos: 15,
            mana: 5,
        },
        range: new NumberRange(1, 2),
        triggerMap: {
            beforeAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'str',
                    value: 3
                },
                {
                    targeting: 'attacker',
                    mod: 'dex',
                    value: 1
                }
            ],
            afterAttack: (context) => [
                {
                    targeting: 'defender',
                    mod: 'pos',
                    value: -8
                },
                {
                    targeting: 'defender',
                    mod: 'sta',
                    value: -5
                }
            ]
        }
    }],

    ['healing-strike', {
        type: AbilityType.Active,
        icon: 'rbxassetid://healing-icon',
        animation: 'healing-strike',
        name: 'Healing Strike',
        description: 'A spiritual attack that heals the user while damaging the enemy',
        direction: EntityStance.Mid,
        dices: [4, 4],
        potencies: new Map<Potency, number>([
            [Potency.Spiritual, 1],
            [Potency.Strike, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Divine, 1],
            [DamageType.Crush, 1]
        ]),
        cost: {
            pos: 12,
            mana: 8,
        },
        range: new NumberRange(1, 1),
        triggerMap: {
            beforeStrikeSequence: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'fai',
                    value: 2
                }
            ],
            afterStrikeSequence: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'hip',
                    value: 15
                },
                {
                    targeting: 'attacker',
                    mod: 'mana',
                    value: 3
                }
            ]
        }
    }],

    ['berserker-rage', {
        type: AbilityType.Active,
        icon: 'rbxassetid://berserker-icon',
        animation: 'berserker-rage',
        name: 'Berserker Rage',
        description: 'Unleash primal fury - gain massive damage but lose defensive capabilities',
        direction: EntityStance.High,
        dices: [8, 8, 8],
        potencies: new Map<Potency, number>([
            [Potency.Strike, 3]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Crush, 3]
        ]),
        cost: {
            pos: 25,
            mana: 0,
        },
        range: new NumberRange(1, 1),
        triggerMap: {
            beforeAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'str',
                    value: 8
                },
                {
                    targeting: 'attacker',
                    mod: 'end',
                    value: 5
                },
                {
                    targeting: 'attacker',
                    mod: 'dex',
                    value: -3
                },
                {
                    targeting: 'attacker',
                    mod: 'acr',
                    value: -5
                }
            ],
            afterAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'pos',
                    value: -10
                },
                {
                    targeting: 'defender',
                    mod: 'pos',
                    value: -15
                },
                {
                    targeting: 'defender',
                    mod: 'org',
                    value: -8
                }
            ]
        }
    }],

    ['precise-thrust', {
        type: AbilityType.Active,
        icon: 'rbxassetid://thrust-icon',
        animation: 'precise-thrust',
        name: 'Precise Thrust',
        description: 'A calculated attack that gains accuracy and penetration over multiple strikes',
        direction: EntityStance.Low,
        dices: [3, 3, 3, 3],
        potencies: new Map<Potency, number>([
            [Potency.Stab, 2]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Impale, 2]
        ]),
        cost: {
            pos: 8,
            mana: 3,
        },
        range: new NumberRange(1, 3),
        triggerMap: {
            beforeStrikeSequence: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'dex',
                    value: 2
                },
                {
                    targeting: 'attacker',
                    mod: 'acr',
                    value: 3
                }
            ],
            afterStrikeSequence: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'dex',
                    value: 1
                }
            ]
        }
    }],

    ['arcane-bolt', {
        type: AbilityType.Active,
        icon: 'rbxassetid://arcane-icon',
        animation: 'arcane-bolt',
        name: 'Arcane Bolt',
        description: 'Channel mystical energy to strike from afar while restoring mana reserves',
        direction: EntityStance.Mid,
        dices: [5, 5],
        potencies: new Map<Potency, number>([
            [Potency.Arcane, 2]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Arcane, 2]
        ]),
        cost: {
            pos: 5,
            mana: 12,
        },
        range: new NumberRange(3, 8),
        triggerMap: {
            beforeAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'int',
                    value: 4
                },
                {
                    targeting: 'attacker',
                    mod: 'spr',
                    value: 2
                }
            ],
            afterAttack: (context) => [
                {
                    targeting: 'attacker',
                    mod: 'mana',
                    value: 8
                },
                {
                    targeting: 'defender',
                    mod: 'mana',
                    value: -6
                },
                {
                    targeting: 'defender',
                    mod: 'spr',
                    value: -3
                }
            ]
        }
    }]
]);

export const CONDITIONAL_ABILITY_EXAMPLES = new Map<string, ActiveAbilityConfig>([
    ['adaptive-strike', {
        type: AbilityType.Active,
        icon: 'rbxassetid://adaptive-icon',
        animation: 'adaptive-strike',
        name: 'Adaptive Strike',
        description: 'A smart attack that changes its effects based on the combat situation',
        direction: EntityStance.Mid,
        dices: [5, 5],
        potencies: new Map<Potency, number>([
            [Potency.Strike, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Crush, 1]
        ]),
        cost: {
            pos: 10,
            mana: 4,
        },
        range: new NumberRange(1, 2),
        triggerMap: {
            beforeAttack: (context) => {
                const { attacker, defender } = context;
                const triggers = [];

                if (attacker.stats.str > defender.stats.str) {
                    triggers.push({
                        targeting: 'attacker' as const,
                        mod: 'dex' as const,
                        value: 3
                    });
                } else {
                    triggers.push({
                        targeting: 'attacker' as const,
                        mod: 'str' as const,
                        value: 4
                    });
                }

                if (defender.hip < 50) {
                    triggers.push({
                        targeting: 'defender' as const,
                        mod: 'pos' as const,
                        value: -8
                    });
                }

                return triggers;
            },
            afterAttack: (context) => {
                const { attacker, defender } = context;
                const triggers = [];

                if (attacker.mana < 20) {
                    triggers.push({
                        targeting: 'attacker' as const,
                        mod: 'mana' as const,
                        value: 10
                    });
                }

                if (defender.pos < 30) {
                    triggers.push({
                        targeting: 'defender' as const,
                        mod: 'sta' as const,
                        value: -5
                    });
                }

                return triggers;
            }
        }
    }]
]);
