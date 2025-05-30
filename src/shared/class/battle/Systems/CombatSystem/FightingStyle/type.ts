import { ActiveAbilityConfig, ReactiveAbilityConfig } from "../Ability/types";

export type FightingStylePassiveEffect = {
    type: PassiveEffectType;
    value: number;
    description: string;
}

export enum PassiveEffectType {
    AdjustDV = 'boostOwnDV',
    AdjustPV = 'boostOwnPV',
    AdjustEnemyDV = 'reduceEnemyDV',
    AdjustEnemyPV = 'reduceEnemyPV',
    AdjustHit = 'boostOwnHit',
    AdjustPen = 'boostOwnPenetration',
    AdjustEnemyHit = 'reduceEnemyHit',
    AdjustEnemyPen = 'reduceEnemyPenetration',
    ReduceDamageReceived = 'reduceDamageReceived',
    IncreaseDamageDealt = 'increaseDamageDealt'
}

export type FightingStyleConfig = {
    name: string;
    description: string;
    activeAbilities: ActiveAbilityConfig[];
    reactionAbilities: ReactiveAbilityConfig[];
    passiveEffects: FightingStylePassiveEffect[];
    switchCost: number; // Posture cost to switch to this style
}

export type FightingStyleState = {
    name: string;
    description: string;
    availableAbilities: string[];
    usedAbilities: string[];
    passiveEffects: FightingStylePassiveEffect[];
}

