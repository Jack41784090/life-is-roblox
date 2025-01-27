import { AbilityConfig, DamageType, iAbility, Potency, potencyMap } from "shared/types/battle-types";
import Entity from "../Entity";

export type AbilityState = {
    acc: number;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    cost: {
        pos: number;
        mana: number;
    };
    range: NumberRange;
    animation: string;
    icon: string;
    name: string;
    description: string;
    using: number;
    target: number;
}

export default class Ability implements iAbility {

    icon: string;
    animation: string;
    name: string;
    description: string;
    acc: number;
    cost: { pos: number; mana: number; };
    range: NumberRange;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    readonly using: Entity;
    readonly target: Entity;

    constructor(opt: AbilityConfig) {
        this.acc = opt.acc;
        this.name = opt.name;
        this.description = opt.description;
        this.cost = opt.cost;
        this.potencies = opt.potencies;
        this.using = new Entity(opt.using);
        this.target = new Entity(opt.target);
        this.damageType = opt.damageType;
        this.range = opt.range;
        this.animation = opt.animation;
        this.icon = opt.icon;
    }

    calculateDamage() {
        let damage = 0;
        this.potencies.forEach((value, key) => {
            const p = potencyMap[key];
            p.forEach(([stat, modifier]) => {
                const st = this.using.stats[stat];
                if (typeIs(st, "number")) {
                    damage += st * modifier * value;
                }
            });
        });
        return damage;
    }

    getState(): AbilityState {
        return {
            acc: this.acc,
            name: this.name,
            description: this.description,
            cost: this.cost,
            potencies: this.potencies,
            using: this.using.playerID,
            target: this.target.playerID,
            damageType: this.damageType,
            range: this.range,
            animation: this.animation,
            icon: this.icon,
        }
    }
}

