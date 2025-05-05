import { ClashResult } from "shared/class/battle/types";
import Entity from "../../../State/Entity";
import { EntityStance, EntityState, EntityUpdate } from "../../../State/Entity/types";

export interface iAbility {
    animation: string,
    name: string;
    description: string;
    icon: string;

    type: AbilityType,
    direction: EntityStance;
    using?: Entity;
    target?: Entity;
    chance: number;
    cost: {
        pos: number,
        mana: number,
    }
}

export type iActiveAbility = iAbility & {
    potencies: Map<AbilityPotency, number>;
    damageType: Map<AbilityDamageType, number>;
    range: NumberRange
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
export type iReactiveAbility = iAbility & {
    successReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    failureReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    getSuccessChance: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => number;
}

export type ActiveAbilityConfig = Omit<iActiveAbility, 'using' | 'target' | 'type'> & {
    using?: Entity;
    target?: Entity;
}
export type ReactiveAbilityConfig = Omit<iReactiveAbility, 'using' | 'target' | 'type'> & {
    using?: Entity;
    target?: Entity;
}
export type AbilityConfig = iActiveAbility | iReactiveAbility;


export type AbilityState = Omit<AbilityConfig, 'using' | 'target'> & {
    using?: EntityState;
    target?: EntityState;
}
export type ActiveAbilityState = Omit<iActiveAbility, 'using' | 'target'> & {
    using?: EntityState;
    target?: EntityState;
}
export type ReactiveAbilityState = Omit<iReactiveAbility, 'using' | 'target'> & {
    using?: EntityState;
    target?: EntityState;
}
export type AbilitySet = {
    [key in keyof typeof Enum.KeyCode]?: iActiveAbility;
};

type RequiredAbility = Required<iAbility>;
export enum AbilityPotency {
    Strike = 'strike',
    Slash = 'slash',
    Stab = 'stab',
    Light = 'light',
    Dark = 'dark',
    Arcane = 'arcane',
    Elemental = 'elemental',
    Occult = 'occult',
    Spiritual = 'spiritual',
    TheWay = 'theWay',
}
export enum AbilityDamageType {
    Blunt = 'blunt',
    Slash = 'slash',
    Pierce = 'pierce',
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


