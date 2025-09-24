
import { Atom } from "@rbxts/charm";
import { DamageType } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import FightingStyle from "shared/class/battle/Systems/CombatSystem/FightingStyle";
import { FightingStyleState } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import { ReadinessIcon } from "shared/class/battle/types";

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
export type EntityConfig =
    EntityBaseAttributes // base attributes that include base, changeable stats, qr pos, player id
    & {
        name?: string;
        team: string;
        iconURL?: ReadinessIcon;
        model?: Model;
        fightingStyles?: FightingStyle[];
    };

export type EntityState =
    Omit<EntityBaseAttributes, 'changeableStats'> & { changeableStats: EntityChangeableStatsState }
    & {
        name: string;
        team: string;
        armed?: keyof typeof Enum.KeyCode;
        activeStyleIndex: number;
        fightingStyles: FightingStyleState[];
    };

// Utility types
export type EntityStatsNoID = Omit<EntityBaseStats, 'id'>;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type ReadonlyEntityState = Readonly<EntityState>;
export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & { playerID: Readonly<number> };
export type EntityChangeable = keyof EntityChangeableStats;
