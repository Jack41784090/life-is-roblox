import { EntityStance } from "shared/class/battle/State/Entity/types";
import FightingStyle from ".";
import { AbilityType, DamageType, Potency } from "../Ability/types";
import { PassiveEffectType } from "./type";

export const BASIC_STANCE = () => new FightingStyle({
    name: "Basic Stance",
    description: "A balanced fighting stance suitable for beginners.",
    switchCost: 10,
    activeAbilities: [
        {
            animation: 'slash',
            name: 'Basic Slash',
            description: 'A simple slashing attack',
            icon: 'slash',
            type: AbilityType.Active,
            direction: EntityStance.High,
            dices: [6, 8],
            cost: {
                pos: 10,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Slash, 80],
                [Potency.Strike, 20],
            ]),
            damageType: new Map([
                [DamageType.Cut, 80],
                [DamageType.Crush, 20]
            ]),
            range: new NumberRange(1, 1)
        },
        {
            animation: 'thrust',
            name: 'Basic Thrust',
            description: 'A simple thrusting attack',
            icon: 'thrust',
            type: AbilityType.Active,
            direction: EntityStance.Mid,
            dices: [8, 6],
            cost: {
                pos: 8,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Stab, 100],
            ]),
            damageType: new Map([
                [DamageType.Impale, 100],
            ]),
            range: new NumberRange(1, 2)
        },
        {
            animation: 'sweep',
            name: 'Leg Sweep',
            description: 'A sweeping attack targeting the legs',
            icon: 'sweep',
            type: AbilityType.Active,
            direction: EntityStance.Low,
            dices: [6, 6],
            cost: {
                pos: 12,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Strike, 100],
            ]),
            damageType: new Map([
                [DamageType.Crush, 100],
            ]),
            range: new NumberRange(1, 1)
        }
    ],
    reactionAbilities: [
        {
            animation: 'block',
            name: 'Basic Block',
            description: 'Block incoming attacks',
            icon: 'block',
            type: AbilityType.Reactive,
            direction: EntityStance.High,
            dices: [6],
            cost: {
                pos: 8,
                mana: 0,
            },
            successReaction: (aa, cr) => {
                const us = aa.using;
                const them = aa.target;
                if (us === undefined || them === undefined) return {};
                return {
                    clashResult: {
                        damage: math.floor(cr.damage * 0.5),
                    },
                    using: {
                        playerID: us.playerID,
                        pos: (us.pos || 0) - 5,
                    }
                };
            },
            failureReaction: () => ({}),
            getSuccessChance: () => 70,
        }
    ],
    passiveEffects: [
        {
            type: PassiveEffectType.AdjustHit,
            value: 1,
            description: "Increases your hit bonus by 1"
        }
    ]
});

export const AGGRESSIVE_STANCE = () => new FightingStyle({
    name: "Aggressive Stance",
    description: "An offensive stance focusing on powerful attacks.",
    switchCost: 15,
    activeAbilities: [
        {
            animation: 'heavy_slash',
            name: 'Power Slash',
            description: 'A powerful overhead slash',
            icon: 'power_slash',
            type: AbilityType.Active,
            direction: EntityStance.High,
            dices: [10, 8],
            cost: {
                pos: 15,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Slash, 100],
            ]),
            damageType: new Map([
                [DamageType.Cut, 100],
            ]),
            range: new NumberRange(1, 1)
        },
        {
            animation: 'lunge',
            name: 'Lunging Strike',
            description: 'A lunging attack with extended reach',
            icon: 'lunge',
            type: AbilityType.Active,
            direction: EntityStance.Mid,
            dices: [8, 8],
            cost: {
                pos: 12,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Stab, 80],
                [Potency.Strike, 20]
            ]),
            damageType: new Map([
                [DamageType.Impale, 80],
                [DamageType.Crush, 20]
            ]),
            range: new NumberRange(1, 2)
        }
    ],
    reactionAbilities: [
        {
            animation: 'parry',
            name: 'Aggressive Parry',
            description: 'Parry incoming attacks with your weapon',
            icon: 'parry',
            type: AbilityType.Reactive,
            direction: EntityStance.High,
            dices: [8],
            cost: {
                pos: 10,
                mana: 0,
            },
            successReaction: (aa, cr) => {
                const us = aa.using;
                const them = aa.target;
                if (us === undefined || them === undefined) return {};
                return {
                    clashResult: {
                        damage: math.floor(cr.damage * 0.3),
                    }
                };
            },
            failureReaction: () => ({}),
            getSuccessChance: () => 60,
        }
    ],
    passiveEffects: [
        {
            type: PassiveEffectType.IncreaseDamageDealt,
            value: 2,
            description: "Increases damage dealt by 2"
        },
        {
            type: PassiveEffectType.AdjustPen,
            value: 1,
            description: "Increases your penetration bonus by 1"
        }
    ]
});

export const DEFENSIVE_STANCE = () => new FightingStyle({
    name: "Defensive Stance",
    description: "A defensive stance focusing on protection and counterattacks.",
    switchCost: 12,
    activeAbilities: [
        {
            animation: 'counter_slash',
            name: 'Counter Slash',
            description: 'A quick slash after a defensive move',
            icon: 'counter_slash',
            type: AbilityType.Active,
            direction: EntityStance.High,
            dices: [8, 6],
            cost: {
                pos: 8,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Slash, 70],
                [Potency.Strike, 30],
            ]),
            damageType: new Map([
                [DamageType.Cut, 70],
                [DamageType.Crush, 30]
            ]),
            range: new NumberRange(1, 1)
        },
        {
            animation: 'shield_bash',
            name: 'Shield Bash',
            description: 'Strike with your shield or guard',
            icon: 'shield_bash',
            type: AbilityType.Active,
            direction: EntityStance.Mid,
            dices: [6, 6],
            cost: {
                pos: 10,
                mana: 0,
            },
            potencies: new Map([
                [Potency.Strike, 100],
            ]),
            damageType: new Map([
                [DamageType.Crush, 100],
            ]),
            range: new NumberRange(1, 1)
        }
    ],
    reactionAbilities: [
        {
            animation: 'shield_block',
            name: 'Shield Block',
            description: 'Block incoming attacks with your shield',
            icon: 'shield_block',
            type: AbilityType.Reactive,
            direction: EntityStance.Mid,
            dices: [10],
            cost: {
                pos: 8,
                mana: 0,
            },
            successReaction: (aa, cr) => {
                const us = aa.using;
                const them = aa.target;
                if (us === undefined || them === undefined) return {};
                return {
                    clashResult: {
                        damage: math.floor(cr.damage * 0.2),
                    }
                };
            },
            failureReaction: () => ({}),
            getSuccessChance: () => 80,
        }
    ],
    passiveEffects: [
        {
            type: PassiveEffectType.ReduceDamageReceived,
            value: 2,
            description: "Reduces damage received by 2"
        },
        {
            type: PassiveEffectType.AdjustEnemyDV,
            value: -2,
            description: "Reduces enemy DV rolls by 2"
        }
    ]
});
//             return {
//                 clashResult: {
//                     damage: 0,
//                 },
//                 using: {
//                     playerID: us.playerID,
//                     pos: us.pos - cr.damage,
//                 }
//             }
//         },
//         failureReaction: () => ({}),
//         getSuccessChance: () => 100,
//     }],
// })
