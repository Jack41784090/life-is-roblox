import { Atom } from "@rbxts/charm";
import { DamageType, Potency } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { EntityConfig } from "./Entity/type";

export type DamageRecord = Partial<Record<DamageType, number>>;

export enum SquadEntityInSquadLocation {
    front = 1,
    middle,
    back
}

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
    LOC: Atom<SquadEntityInSquadLocation>,
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
    // qr: Vector2,
};

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

export type EntityState =
    Omit<EntityBaseAttributes, 'changeableStats'> & { changeableStats: Partial<EntityChangeableStatsState> }
    & {
        name: string;
        team: string;
        // armed?: keyof typeof Enum.KeyCode;
        // activeStyleIndex: number;
        // fightingStyles: FightingStyleState[];
    };

// Utility types
export type EntityStatsNoID = Omit<EntityBaseStats, 'id'>;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type ReadonlyEntityState = Readonly<EntityState>;
// export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & { playerID: Readonly<number> };
export type EntityChangeable = keyof EntityChangeableStats;

export enum SquadLocation {
    front = 1,
    back,
}

export type SquadConfig = {
    entities: (EntityConfig)[];
    name: string;
    team?: string;
}

export type SquadBattleConfig = {
    teams: Record<string, SquadConfig[]>;
}

export type EntityChange_Special = |
    'DODGE' |
    'CLINK' |
    'LEAVE' |
    'DIE' |
    'RETREAT';

export type EntityChange = {
    property: EntityChangeable | EntityChange_Special;
    from: number;
    to: number;
};

export type EntityUpdate = {
    source: number,
    affected: number,
    change: EntityChange,
    done?: boolean
}

export interface WeaponConfig {
    hitBonus: number;
    penetrationBonus: number;
    damageTranslation: Partial<Record<Reality, [Potency, number][]>>;
    weaponRange: Partial<Record<SquadEntityInSquadLocation, SquadEntityInSquadLocation[]>>;
}

export type WeaponState = WeaponConfig;
