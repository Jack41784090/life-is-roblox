import { Reality } from "shared/class/battle/types";
import { Potency } from "../Ability/types";

export interface WeaponConfig {
    hitBonus: number;
    penetrationBonus: number;
    damageTranslation: Record<Reality, [Potency, number][]>;
}
