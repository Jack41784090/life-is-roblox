import { WeaponConfig } from "./types";

export const weapons: Map<string, WeaponConfig> = new Map([
    ["Adalbrecht's Flammenschwert", {
        hitBonus: 5,
        penetrationBonus: 5,
        damageTranslation: {
            'force': []
        }
    }]
])