import { AbilityInitOptions, DamageType, iAbility, Potency, potencyMap } from "shared/types/battle-types";
import Entity from "./Entity";

export default class Ability implements iAbility {
    name: string;
    description: string;
    acc: number;
    cost: { pos: number; mana: number; };
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    using: Entity;
    target: Entity;

    constructor(opt: AbilityInitOptions) {
        this.acc = opt.acc;
        this.name = opt.name;
        this.description = opt.description;
        this.cost = opt.cost;
        this.potencies = opt.potencies;
        this.using = opt.using;
        this.target = opt.target;
        this.damageType = opt.damageType;
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
}

