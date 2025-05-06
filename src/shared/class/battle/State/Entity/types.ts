import Armour from "../../Systems/CombatSystem/Armour";
import { ArmourState } from "../../Systems/CombatSystem/Armour/types";
import Weapon from "../../Systems/CombatSystem/Weapon";
import { WeaponState } from "../../Systems/CombatSystem/Weapon/types";
import { ReadinessIcon } from "../../types";

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

// Base entity attributes that most entity types build upon
export type EntityBaseAttributes = {
    playerID: number;
    stats: EntityStats;
    qr: Vector2;
    hip: number;
    pos: number;
    org: number;
    sta: number;
    mana: number;
};

// Common equipment attributes
export type EntityEquipment = {
    weapon: Weapon;
    armour: Armour;
};

export type EntityEquipmentState = {
    weapon: WeaponState
    armour: ArmourState
}

export type EntityConfig = EntityBaseAttributes & Partial<EntityEquipmentState> & {
    name?: string;
    team?: string;
    iconURL?: ReadinessIcon;
    model?: Model;
};

export enum EntityStance {
    High = 'high',
    Mid = 'mid',
    Low = 'low',
    Prone = 'prone',
}

export type EntityState = EntityBaseAttributes & EntityEquipmentState & {
    name: string;
    team?: string;
    armed?: keyof typeof Enum.KeyCode;
    stance: EntityStance;
};

// Utility types
export type EntityStatsNoID = Omit<EntityStats, 'id'>;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type ReadonlyEntityState = Readonly<EntityState>;
export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & { playerID: number };
export type EntityChangeable = keyof Omit<EntityBaseAttributes, 'qr' | 'playerID' | 'stats'>;
