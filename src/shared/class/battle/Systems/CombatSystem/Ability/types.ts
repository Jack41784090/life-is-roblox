import Entity from "../../../State/Entity";
import { EntityStance, EntityState, EntityUpdate } from "../../../State/Entity/types";
import { ClashResult } from "../types";

export interface AbilityConfig {
    animation: string,
    name: string;
    description: string;
    icon: string;

    type: AbilityType,
    direction: EntityStance;
    using?: Entity;
    target?: Entity;
    dices: number[];
    cost: {
        pos: number,
        mana: number,
    }
}
export type ActiveAbilityConfig = AbilityConfig & {
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    range: NumberRange
}
export type ReactiveAbilityConfig = AbilityConfig & {
    successReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    failureReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    getSuccessChance: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => number;
}


export type PreReactionClashResult = Omit<ClashResult, 'defendAttemptName' | 'defendAttemptSuccessful' | 'defendReactionUpdate'> & {
    defendAttemptName?: string;
    defendAttemptSuccessful?: boolean;
};
export type ReactionUpdate = {
    using?: EntityUpdate;
    target?: EntityUpdate;
    clashResult?: Partial<PreReactionClashResult>;
}


export type AbilityState = ActiveAbilityState | ReactiveAbilityState;
export type ActiveAbilityState = Omit<ActiveAbilityConfig, 'using' | 'target'> & {
    using?: EntityState,
    target?: EntityState,
}
export type ReactiveAbilityState = Omit<ReactiveAbilityConfig, 'using' | 'target'> & {
    using?: EntityState,
    target?: EntityState,
};
export type AbilitySet = {
    [key in keyof typeof Enum.KeyCode]?: ActiveAbilityConfig;
};

export type AbilitySetDefinition = {
    Q?: ActiveAbilityConfig;
    W?: ActiveAbilityConfig;
    E?: ActiveAbilityConfig;
    R?: ActiveAbilityConfig;
};

type RequiredAbility = Required<AbilityConfig>;
export enum Potency {
    Strike = 'strike',
    Slash = 'slash',
    Stab = 'stab',
    Light = 'light',
    Dark = 'dark',
    Arcane = 'arcane',
    Elemental = 'elemental',
    Occult = 'occult',
    Spiritual = 'spiritual',
    TheWay = 'dawa',
}
export enum DamageType {
    Crush = 'blunt',
    Cut = 'slash',
    Impale = 'pierce',
    Poison = 'poison',
    Fire = 'fire',
    Frost = 'frost',
    Electric = 'electric',
    Psychic = 'psychic',
    Spiritual = 'spiritual',
    Divine = 'divine',
    Necrotic = 'necrotic',
    Arcane = 'arcane',
}

export enum AbilityType {
    None = 'none',
    Active = 'active',
    Reactive = 'reactive',
}


