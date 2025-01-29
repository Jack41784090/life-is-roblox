import Entity from "../Entity";
import { potencyMap } from "./const";
import { AbilityConfig, AbilityState, AbilityType, DamageType, iAbility, Potency } from "./types";

export default class Ability implements iAbility {
    type: AbilityType = AbilityType.Active;
    icon: string;
    animation: string;
    name: string;
    description: string;
    acc: number;
    cost: { pos: number; mana: number; };
    range: NumberRange;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    readonly using?: Entity;
    readonly target?: Entity;

    constructor(opt: AbilityConfig) {
        this.acc = opt.acc;
        this.name = opt.name;
        this.description = opt.description;
        this.cost = opt.cost;
        this.potencies = opt.potencies;
        this.using = opt.using;
        this.target = opt.target;
        this.damageType = opt.damageType;
        this.range = opt.range;
        this.animation = opt.animation;
        this.icon = opt.icon;
    }

    calculateDamage() {
        if (this.using === undefined) return 0;

        let damage = 0;
        this.potencies.forEach((value, key) => {
            const p = potencyMap[key];
            p.forEach(([stat, modifier]) => {
                const st = this.using!.stats[stat];
                if (typeIs(st, "number")) {
                    damage += st * modifier * value;
                }
            });
        });
        return damage;
    }

    getState(): AbilityState {
        return {
            ... this,
            using: this.using?.state(),
            target: this.target?.state(),
        }
    }
}

