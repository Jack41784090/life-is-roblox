import Logger from "shared/utils/Logger";
import { ActiveAbility } from "../Ability";
import { DamageType } from "../Ability/types";
import { ArmourConfig, ArmourState } from "./types";

export default class Armour {
    private logger = Logger.createContextLogger("Armour");
    private DV: number;
    private PV: number;
    private resistance: Map<DamageType, number> = new Map();

    public static Unprotected(): Armour {
        return new Armour({
            DV: 10, PV: 5, resistance: new Map([
                [DamageType.Cut, -0.2],
                [DamageType.Impale, -0.2],
            ])
        });
    }

    constructor({ DV, PV, resistance }: ArmourConfig) {
        this.DV = DV;
        this.PV = PV;
        this.resistance = resistance;
        this.logger.debug("Armour created", { DV, PV, resistance });
    }

    public getDV(): number {
        this.logger.debug(`Getting Deflection Value: ${this.DV}`);
        return this.DV;
    }
    public getPV(): number {
        this.logger.debug(`Getting Penetration Value: ${this.PV}`);
        return this.PV;
    }

    public getRawDamageTaken(ability: ActiveAbility): number {
        const attacker = ability.getState().using;
        if (!attacker?.weapon) {
            this.logger.debug("No attacker or weapon found, returning 0 damage");
            return 0;
        }

        this.logger.debug(`Calculating damage from ${attacker.name}'s ability: ${ability.getState().name}`);

        const damageTypesArray = ability.getTotalDamageArray();
        this.logger.debug("Damage types array:", damageTypesArray);

        let damage = 0;
        for (const [damageType, value] of pairs(damageTypesArray)) {
            damage += this.resistance.get(damageType) ? value * (1 - this.resistance.get(damageType)!) : value;
        }

        this.logger.debug(`Total raw damage taken: ${damage}`);
        return damage;
    }

    public getState(): ArmourState {
        return {
            DV: this.DV,
            PV: this.PV,
            resistance: this.resistance,
        };
    }
}