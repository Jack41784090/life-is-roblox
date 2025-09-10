import { Atom } from "@rbxts/charm";
import Armour from "../../Systems/CombatSystem/Armour";
import { ArmourState } from "../../Systems/CombatSystem/Armour/types";
import FightingStyle from "../../Systems/CombatSystem/FightingStyle";
import { FightingStyleState } from "../../Systems/CombatSystem/FightingStyle/type";
import Weapon from "../../Systems/CombatSystem/Weapon";
import { WeaponState } from "../../Systems/CombatSystem/Weapon/types";
import { ReadinessIcon } from "../../types";

export type EntityBaseStats = {
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

export type EntityChangeableStats = {
    STA: Atom<number>,
    HP: Atom<number>,
    ORG: Atom<number>,
    POS: Atom<number>,
    MAG: Atom<number>,
}

export type EntityChangeableStatsState = {
    STA: number,
    HP: number,
    ORG: number,
    POS: number,
    MAG: number,
}

// Base entity attributes that most entity types build upon
export type EntityBaseAttributes = {
    playerID: number,
    stats: EntityBaseStats,
    changeableStats: EntityChangeableStats,
    qr: Vector2,
};

// Common equipment attributes
export type EntityEquipment = {
    weapon: Weapon;
    armour: Armour;
};

export type EntityEquipmentStates = {
    weapon: WeaponState
    armour: ArmourState
}

/**
 * Configuration object for creating an entity in the battle system.
 * 
 * @description Combines base entity attributes with optional equipment, styling, and metadata.
 * The configuration includes required team assignment and base attributes, while allowing
 * customization through optional equipment, visual elements, and fighting capabilities.
 * 
 * @example
 * ```typescript
 * const playerConfig: EntityConfig = {
 *   // EntityBaseAttributes required
 *   baseStats: { health: 100, attack: 50 },
 *   position: { x: 0, y: 0 },
 *   playerId: "player123",
 *   
 *   // Required team assignment
 *   team: "heroes",
 *   
 *   // Optional customization
 *   name: "Warrior",
 *   iconURL: ReadinessIcon.READY,
 *   equipment: { weapon: sword, armor: chainmail },
 *   fightingStyles: [FightingStyle.AGGRESSIVE]
 * };
 * ```
 */
export type EntityConfig =
    EntityBaseAttributes // base attributes that include base, changeable stats, qr pos, player id
    & Partial<EntityEquipmentStates> // weapons and armour is not required because they have defaults
    & {
        name?: string;
        team: string;
        iconURL?: ReadinessIcon;
        model?: Model;
        fightingStyles?: FightingStyle[];
    };

export type EntityState =
    Omit<EntityBaseAttributes, 'changeableStats'> & { changeableStats: EntityChangeableStatsState }
    & EntityEquipmentStates
    & {
        name: string;
        team: string;
        armed?: keyof typeof Enum.KeyCode;
        activeStyleIndex: number;
        fightingStyles: FightingStyleState[];
    };

export enum EntityStance {
    High = 'high',
    Mid = 'mid',
    Low = 'low',
    Prone = 'prone',
}

export type EntityGraphicsConfig = {
    template: Model;
    nametagText: string;
}

// Utility types
export type EntityStatsNoID = Omit<EntityBaseStats, 'id'>;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type ReadonlyEntityState = Readonly<EntityState>;
export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & { playerID: Readonly<number> };
export type EntityChangeable = keyof EntityChangeableStats;
