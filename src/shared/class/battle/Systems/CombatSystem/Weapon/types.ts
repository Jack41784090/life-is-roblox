import { Reality } from "shared/class/battle/types";
import { Potency } from "../Ability/types";

export interface WeaponConfig {
    hitBonus: number;
    penetrationBonus: number;
    damageTranslation: Partial<Record<Reality, [Potency, number][]>>;
}

export type WeaponState = WeaponConfig;
