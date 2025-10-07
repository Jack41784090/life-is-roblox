import { iSquadEntity } from "squad-battle/Entity/type";
import { EntityUpdate } from "squad-battle/type";

// --- 1. Define Specific String Literals (Enums or Types) ---
// This is the biggest improvement. Instead of `string`, we define the exact
// possible values. This gives us autocomplete and compile-time error checking.

export type TriggerType =
    | 'OnClashStart'      // When a battle/clash begins
    | 'OnBasicAttackHit'  // The moment an attack connects
    | 'OnDamageDealt'     // After damage from any source is calculated and dealt
    | 'OnDamageTaken'
    | 'OnAbilityCasted'
    | 'OnKill'
    | 'OnDeath';

export type ConditionType =
    | 'TargetHasStatusEffect'
    | 'TargetHealthBelowPercent'
    | 'OwnerHealthBelowPercent'
    | 'IsCriticalHit';

export type EffectType =
    | 'Damage'
    | 'Heal'
    | 'ApplyStatusEffect'
    | 'ModifyStat';

export type CalculationType =
    | 'Flat'                     // A simple, fixed value
    | 'StatScaling'              // Scales with a stat (e.g., Attack Power)
    | 'TargetCurrentHealthPercent'
    | 'TargetMaxHealthPercent';

export type StatType =
    | 'Health'
    | 'Attack'
    | 'Defense'
    | 'Speed';

export type DamageType =
    | 'Physical'
    | 'Magic'
    | 'True';


// --- 2. Use Discriminated Unions for Effects ---
// This ensures that an effect's properties are relevant to its type.
// A 'Damage' effect should have a `damageType`, but a 'Heal' effect should not.

interface BaseEffectData {
    type: EffectType;
}

export interface DamageEffectData extends BaseEffectData {
    type: 'Damage';
    damageType: DamageType;
    amount?: number; // Base amount, can be 0 if fully reliant on calculation
    calculation?: iSkillCalculation;
}

export interface HealEffectData extends BaseEffectData {
    type: 'Heal';
    amount?: number;
    calculation?: iSkillCalculation;
}

export interface ApplyStatusEffectData extends BaseEffectData {
    type: 'ApplyStatusEffect';
    skillId: string; // The ID of the skill/status effect to apply
    duration: number;
}

export interface ModifyStatEffectData extends BaseEffectData {
    type: 'ModifyStat';
    stat: StatType;
    amount: number; // Can be negative for a debuff
    isPercent: boolean; // Is it a flat +10 or a +10% modifier?
}

// This union is the "master" type for any possible effect.
export type SkillEffectData =
    | DamageEffectData
    | HealEffectData
    | ApplyStatusEffectData
    | ModifyStatEffectData;


// --- 3. Refined Core Types ---
// Now we use our specific types to build the main structures.

export type iSkillCalculation = {
    type: CalculationType;
    stat?: StatType;   // Only relevant for 'StatScaling'
    percent?: number; // Relevant for scaling and percent-based calculations
}

export type iSkillCondition = {
    type: ConditionType;
    value: string | number; // e.g., 'SE_BURNING' or 50 (for 50%)
    invert?: boolean; // e.g., Target does NOT have status effect
}

export type iSkillEffect = {
    trigger: TriggerType;
    conditions?: iSkillCondition[];
    effect: SkillEffectData;
    destroyOnTrigger?: boolean;
}

// Renamed from 'iSkill' to be more descriptive of its role as a temporary buff/debuff
export type iSkill = {
    id: string;
    name: string;
    duration: number; // in seconds. 0 or -1 could mean permanent until cleansed.
    maxStacks?: number;
    effects: iSkillEffect[]; // The triggered effects this status provides
}

// --- 4. Refined Event Context ---
// The context for when an event is fired. Can be expanded as needed.
// `iOneClash` is a specific type of EventContext
export type iOneClash = {
    commit(): EntityUpdate[]
};

export type iOneClashConfig = {

    source?: iSkill; // The skill/item/etc. that caused the event
    attacker: iSquadEntity;
    defender?: iSquadEntity; // Defender is optional for self-casts or AoE
    targets?: iSquadEntity[]; // For AoE
}