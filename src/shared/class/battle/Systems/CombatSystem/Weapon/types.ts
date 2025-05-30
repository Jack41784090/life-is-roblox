import { Potency } from "../Ability/types";
import { Reality } from "../types";

export interface WeaponConfig {
    hitBonus: number;
    penetrationBonus: number;
    damageTranslation: Partial<Record<Reality, [Potency, number][]>>;
}

export type WeaponState = WeaponConfig;
