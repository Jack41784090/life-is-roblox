
import { Potency } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import Logger from "shared/utils/Logger";
import { iSquadEntity } from "squad-battle/Entity/type";
import { SquadEntityInSquadLocation, WeaponConfig } from "squad-battle/type";
import { iWeapon } from "./type";
export default class Weapon implements iWeapon {
    private logger = Logger.createContextLogger("Weapon");

    private hitBonus: number;
    private penetrationBonus: number;
    private damageTranslation: [Reality, [Potency, number][]][] = [];
    private weaponLocationMap: [SquadEntityInSquadLocation, SquadEntityInSquadLocation[]][] = [];


    static Unarmed(): Weapon {
        return new Weapon({
            hitBonus: 0, penetrationBonus: 0, damageTranslation: {
                [Reality.Force]: [[Potency.Strike, 1]],
            },
            weaponRange: {
                [SquadEntityInSquadLocation.front]: [SquadEntityInSquadLocation.front],
                [SquadEntityInSquadLocation.middle]: [],
                [SquadEntityInSquadLocation.back]: []
            }
        });
    }

    constructor(config: WeaponConfig) {
        this.hitBonus = config.hitBonus;
        this.penetrationBonus = config.penetrationBonus;
        for (const [key, value] of pairs(config.damageTranslation)) {
            this.damageTranslation.push([key, value] as [Reality, [Potency, number][]]);
        }
        for (const [key, value] of pairs(config.weaponRange)) {
            this.weaponLocationMap.push([key, value] as [SquadEntityInSquadLocation, SquadEntityInSquadLocation[]]);
        }
    }

    public getRangeAtLocation(loc: SquadEntityInSquadLocation): SquadEntityInSquadLocation[] {
        return this.weaponLocationMap.find(([key, _]) => key === loc)?.[1] || [];
    }

    public getTotalPenetrationValue(attacker: iSquadEntity): number {
        const force = attacker.calculateRealityValue(Reality.Force);
        const pre = attacker.calculateRealityValue(Reality.Precision);
        const result = this.penetrationBonus + force * 0.67 + pre * 0.33;
        return result;
    }

    public getTotalHitValue(attacker: iSquadEntity): number {
        const man = attacker.calculateRealityValue(Reality.Maneuver);
        const pre = attacker.calculateRealityValue(Reality.Precision);
        const result = this.hitBonus + man / 2 + pre / 2;
        return result;
    }

    public getPotencyArrayDamage(attacker: iSquadEntity): Record<Potency, number> {
        const damagePotencies = this.damageTranslation.reduce((acc, [reality, damagePotencies]) => {
            const warriorsReality = attacker.calculateRealityValue(reality);
            for (const [potency, value] of damagePotencies) {
                const potencyDamage = value * warriorsReality;
                acc[potency] = (acc[potency] || 0) + potencyDamage;
            }
            return acc;
        }, {} as Record<Potency, number>);
        return damagePotencies;
    }

    public getPotencyDamage(potency: Potency, attacker: iSquadEntity): number {
        const damagePotencies = this.damageTranslation.filter(([reality, [[p, n]]]) => {
            return p === potency;
        });
        if (damagePotencies.size() === 0) {
            return 0;
        }
        const damage = damagePotencies.reduce((dmgAcc, [reality, damagePotencies]) => {
            const warriorsReality = attacker.calculateRealityValue(reality);
            const potencyDmg = damagePotencies.reduce((potAcc, [potency, value]) => {
                const dmg = value * warriorsReality;
                return potAcc + dmg;
            }, 0);
            return dmgAcc + potencyDmg;
        }, 0);
        return damage;
    }

    public getRawWeaponDamage(attacker: iSquadEntity): number {
        const damage = this.damageTranslation.reduce((dmgAcc, [reality, damagePotencies]) => {
            const warriorsReality = attacker.calculateRealityValue(reality);
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
            }, {} as Record<Reality, [Potency, number][]>),
            weaponRange: this.weaponLocationMap.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {} as Record<SquadEntityInSquadLocation, SquadEntityInSquadLocation[]>)
        };
    }
}