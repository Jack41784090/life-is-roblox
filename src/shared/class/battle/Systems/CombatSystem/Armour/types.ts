import { DamageType } from "../Ability/types";

export interface ArmourConfig {
    DV: number;
    PV: number;
    resistance: Map<DamageType, number>;
}

export type ArmourState = ArmourConfig;
