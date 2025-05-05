import { EntityStats } from "../../../State/Entity/types";

export default class Weapon {
    baseDamage = 10;
    baseAccuracy = 100;
    strengthBase = 5;
    skillBase = 2;

    calculateStats(entityStats: EntityStats,) {
        // strength: number, skill: number, footwork: number, ability: { damagePotential: { strength: number; skill: number; }, type: { [key: string]: number; } }
        const { str, dex } = entityStats;
        const ability = {
            damagePotential: {
                strength: 50,
                skill: 50,
            },
            type: {
                slash: 50,
                pierce: 50,
            },
        }

        const extraDamageFromStrength = math.max(0, str - this.strengthBase);
        const extraDamageFromSkill = math.max(0, dex - this.skillBase);
        const totalDamageStrength = (this.baseDamage + extraDamageFromStrength) * (ability.damagePotential.strength / 100);
        const totalDamageSkill = (this.baseDamage + extraDamageFromSkill) * (ability.damagePotential.skill / 100);
        const totalDamage = totalDamageStrength + totalDamageSkill;
        // const damageBreakdown = countObjectKeys(ability.type).reduce((acc, [typeName, percent]) => {
        //     acc[typeName] = totalDamage * (percent / 100);
        //     return acc;
        // }, {} as Record<string, number>);
        const damageBreakdown = {};
        const finalAccuracy = this.baseAccuracy + extraDamageFromSkill * 10;
        return { totalDamage, damageBreakdown, finalAccuracy };
    }
}