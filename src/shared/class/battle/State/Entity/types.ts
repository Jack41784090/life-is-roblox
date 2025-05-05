import { ReadinessIcon } from "shared/class/battle/types";
import Armour from "../../Systems/CombatSystem/Armour";
import Weapon from "../../Systems/CombatSystem/Weapon";

export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,
    iconURL?: ReadinessIcon,
    model?: Instance,
    qr: Vector2,
    weapon?: Weapon;
    armour?: Armour;
}
export type EntityStats = {
    id: string;
    str: number; // Strength
    dex: number; // Dexterity
    acr: number; // Acrobatics
    spd: number; // Speed
    siz: number; // Size
    int: number; // Intelligence
    spr: number; // Spirituality
    fai: number; // Faith
    cha: number; // Charisma
    beu: number; // Beauty
    wil: number; // Willpower
    end: number; // Endurance
};
export type EntityStatsNoID = Omit<EntityStats, 'id'>;
export type EntityInitHardRequirements = {
    qr: Vector2;
    playerID: number;
    stats: EntityStats;
    hip: number;
    pos: number;
    org: number;
    sta: number;
    mana: number;
}
export type EntityInit = Partial<iEntity> & EntityInitHardRequirements;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type EntityState = EntityInitHardRequirements & {
    name: string;
    team?: string;
    armed?: keyof typeof Enum.KeyCode;
    qr?: Vector2;
    stance: EntityStance;
    weapon?: Weapon;
    armour?: Armour;
}
export type ReadonlyEntityState = Readonly<EntityState>;
export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & {
    playerID: number;
}
export enum EntityStance {
    High = 'high',
    Mid = 'mid',
    Low = 'low',
    Prone = 'prone',
}

export type EntityChangeable = keyof Omit<EntityInitHardRequirements, 'qr' | 'playerID' | 'stats'>
