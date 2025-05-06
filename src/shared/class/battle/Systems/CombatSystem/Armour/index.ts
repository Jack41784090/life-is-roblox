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
        return new Armour({ DV: 0, PV: 0, resistance: new Map() });
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
        this.resistance.forEach((resistance, dtype) => {
            const damageValue = damageTypesArray[dtype] || 0;
            const damageTaken = damageValue * (1 - resistance);
            this.logger.debug(`Damage type ${dtype}: ${damageValue} * (1 - ${resistance}) = ${damageTaken}`);
            damage += damageTaken;
        });

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