// Define the different types of effects we support
export enum EffectType {
    ClashFate = "clashFate",
    Damage = "damage",
    StyleSwitch = "styleSwitch",
    AbilityReaction = "abilityReaction",
    AbilityUse = "abilityUse",
    HitImpact = "hitImpact",
    DetailedHitAnalysis = "detailedHitAnalysis"
}

// Interface for each effect in our queue
export interface Effect {
    id: string;
    type: EffectType;
    position: UDim2;
    color?: Color3;
    damage?: number;
    abilityName?: string;
    impactSize?: number;
    fate?: string;
    createdAt: number;
    roll?: number;
    target?: number;
    die?: string;
    bonus?: number;
    checkType?: "DV" | "PV";
    weaponName?: string;
    armourName?: string;
}


// Define the interface for combat effects API
export interface CombatEffectsAPI {
    showDamage: (position: UDim2, damage: number) => void;
    showStyleSwitch: (position: UDim2, color: Color3) => void;
    showAbilityReaction: (position: UDim2, color: Color3, abilityName: string) => void;
    showHitImpact: (position: UDim2, color: Color3, impactSize: number) => void;
    showAbilityUse: (position: UDim2, color: Color3, abilityName: string) => void;
    showDetailedHitAnalysis: (position: UDim2, analysisData: DetailedHitAnalysisData) => void;
}

export interface DetailedHitAnalysisData {
    roll: number;
    target: number;
    die: string;
    bonus: number;
    checkType: "DV" | "PV";
    fate: string;
    damage?: number;
    weaponName: string;
    armourName: string;
}

// Define interface for event data
export interface ClashFateEventData {
    position: UDim2;
    color: Color3;
    fate: string;
}

export interface DamageEventData {
    position: UDim2;
    damage: number;
}

export interface StyleSwitchEventData {
    position: UDim2;
    color: Color3;
}

export interface AbilityReactionEventData {
    position: UDim2;
    color: Color3;
    abilityName: string;
}

export interface HitImpactEventData {
    position: UDim2;
    color: Color3;
    impactSize: number;
}

export interface AbilityUseEventData {
    position: UDim2;
    color: Color3;
    abilityName: string;
}

export interface DetailedHitAnalysisEventData {
    position: UDim2;
    analysisData: DetailedHitAnalysisData;
}

export type EffectEventData =
    | DamageEventData
    | StyleSwitchEventData
    | AbilityReactionEventData
    | HitImpactEventData
    | AbilityUseEventData
    | DetailedHitAnalysisEventData;
