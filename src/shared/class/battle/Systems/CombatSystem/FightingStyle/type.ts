import { ActiveAbilityConfig, ReactiveAbilityConfig } from "../Ability/types";

export type FightingStylePassiveEffect = {
    type: PassiveEffectType;
    value: number;
    description: string;
}

export enum PassiveEffectType {
    ReduceEnemyDV = 'reduceEnemyDV',
    ReduceEnemyPV = 'reduceEnemyPV',
    BoostOwnHit = 'boostOwnHit',
    BoostOwnPenetration = 'boostOwnPenetration',
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

