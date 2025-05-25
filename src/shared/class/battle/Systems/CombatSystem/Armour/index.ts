import Logger from "shared/utils/Logger";
import { DamageType } from "../Ability/types";
import { ArmourConfig, ArmourState } from "./types";

export default class Armour {
    private logger = Logger.createContextLogger("Armour");
    private DV: number;
    private PV: number;
    private resistance: Map<DamageType, number> = new Map();

    public static Unprotected(): Armour {
        return new Armour({
            DV: 12, PV: 5, resistance: new Map([
                [DamageType.Cut, -0.2],
                [DamageType.Impale, -0.2],
            ])
        });
    }

    constructor({ DV, PV, resistance }: ArmourConfig) {
        this.DV = DV;
        this.PV = PV;
        this.resistance = resistance;
    }

    public getDV(): number {
        return this.DV;
    }

    public getPV(): number {
        return this.PV;
    }

    public getRawDamageTaken(damageTypesArray: Record<DamageType, number>): number {
        let damage = 0;
        for (const [damageType, value] of pairs(damageTypesArray)) {
            damage += this.resistance.get(damageType) ? value * (1 - this.resistance.get(damageType)!) : value;
        }

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