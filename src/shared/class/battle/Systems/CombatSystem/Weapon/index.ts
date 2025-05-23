import Entity from "shared/class/battle/State/Entity";
import { Reality } from "shared/class/battle/types";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import { Potency } from "../Ability/types";
import { WeaponConfig } from "./types";

export default class Weapon {
    private logger = Logger.createContextLogger("Weapon");

    private hitBonus: number;
    private penetrationBonus: number;
    private damageTranslation: [Reality, [Potency, number][]][] = [];

    static Unarmed(): Weapon {
        return new Weapon({
            hitBonus: 0, penetrationBonus: 0, damageTranslation: {
                [Reality.Force]: [[Potency.Strike, 1]],
            }
        });
    }

    constructor(config: WeaponConfig) {
        this.hitBonus = config.hitBonus;
        this.penetrationBonus = config.penetrationBonus;
        for (const [key, value] of pairs(config.damageTranslation)) {
            this.damageTranslation.push([key, value]);
        }
    }

    public getTotalPenetrationValue(attacker: Entity): number {
        const force = calculateRealityValue(Reality.Force, attacker.stats);
        const pre = calculateRealityValue(Reality.Precision, attacker.stats);
        const result = this.penetrationBonus + force * 0.67 + pre * 0.33;
        return result;
    }

    public getTotalHitValue(attacker: Entity): number {
        const man = calculateRealityValue(Reality.Maneuver, attacker.stats);
        const pre = calculateRealityValue(Reality.Precision, attacker.stats);
        const result = this.hitBonus + man / 2 + pre / 2;
        return result;
    }

    public getPotencyArrayDamage(attacker: Entity): Record<Potency, number> {
        const damagePotencies = this.damageTranslation.reduce((acc, [reality, damagePotencies]) => {
            const warriorsReality = calculateRealityValue(reality, attacker.stats);
            for (const [potency, value] of damagePotencies) {
                const potencyDamage = value * warriorsReality;
                acc[potency] = (acc[potency] || 0) + potencyDamage;
            }
            return acc;
        }, {} as Record<Potency, number>);
        return damagePotencies;
    }

    public getPotencyDamage(potency: Potency, attacker: Entity): number {
        const damagePotencies = this.damageTranslation.filter(([reality, [[p, n]]]) => {
            return p === potency;
        });
        if (damagePotencies.size() === 0) {
            return 0;
        }
        const damage = damagePotencies.reduce((dmgAcc, [reality, damagePotencies]) => {
            const warriorsReality = calculateRealityValue(reality, attacker.stats);
            const potencyDmg = damagePotencies.reduce((potAcc, [potency, value]) => {
                const dmg = value * warriorsReality;
                return potAcc + dmg;
            }, 0);
            return dmgAcc + potencyDmg;
        }, 0);
        return damage;
    }

    public getRawWeaponDamage(attacker: Entity): number {
        const damage = this.damageTranslation.reduce((dmgAcc, [reality, damagePotencies]) => {
            const warriorsReality = calculateRealityValue(reality, attacker.stats);
            const realityDmg = damagePotencies.reduce((potAcc, [potency, value]) => {
                const dmg = value * warriorsReality;
                return potAcc + dmg;
            }, 0);
            return dmgAcc + realityDmg;
        }, 0);
        return damage;
    }

    public getState(): WeaponConfig {
        return {
            hitBonus: this.hitBonus,
            penetrationBonus: this.penetrationBonus,
            damageTranslation: this.damageTranslation.reduce((acc, [reality, damagePotencies]) => {
                acc[reality] = damagePotencies;
                return acc;
            }, {} as Record<Reality, [Potency, number][]>)
        }
    }

    // private baseDamage = 10;
    // private baseAccuracy = 100;
    // private strengthBase = 5;
    // private skillBase = 2;

    // calculateStats(entityStats: EntityStats,) {
    //     // strength: number, skill: number, footwork: number, ability: { damagePotential: { strength: number; skill: number; }, type: { [key: string]: number; } }
    //     const { str, dex } = entityStats;
    //     const ability = {
    //         damagePotential: {
    //             strength: 50,
    //             skill: 50,
    //         },
    //         type: {
    //             slash: 50,
    //             pierce: 50,
    //         },
    //     }

    //     const extraDamageFromStrength = math.max(0, str - this.strengthBase);
    //     const extraDamageFromSkill = math.max(0, dex - this.skillBase);
    //     const totalDamageStrength = (this.baseDamage + extraDamageFromStrength) * (ability.damagePotential.strength / 100);
    //     const totalDamageSkill = (this.baseDamage + extraDamageFromSkill) * (ability.damagePotential.skill / 100);
    //     const totalDamage = totalDamageStrength + totalDamageSkill;
    //     // const damageBreakdown = countObjectKeys(ability.type).reduce((acc, [typeName, percent]) => {
    //     //     acc[typeName] = totalDamage * (percent / 100);
    //     //     return acc;
    //     // }, {} as Record<string, number>);
    //     const damageBreakdown = {};
    //     const finalAccuracy = this.baseAccuracy + extraDamageFromSkill * 10;
    //     return { totalDamage, damageBreakdown, finalAccuracy };
    // }
}