import Entity from "../Entity";
import { EntityState } from "../Entity/types";

export type AbilityConfig = iAbility;
export type AbilityState = Omit<AbilityConfig, 'using' | 'target'> & {
    using?: EntityState;
    target?: EntityState;
}
export type AbilitySet = {
    [key in keyof typeof Enum.KeyCode]?: iAbility;
};

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
    TheWay = 'theWay',
}
export interface iAbility {
    type: AbilityType,
    animation: string,
    name: string;
    description: string;
    icon: string;
    using?: Entity;
    target?: Entity;
    acc: number;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    cost: {
        pos: number,
        mana: number,
    }
    range: NumberRange
}
type RequiredAbility = Required<iAbility>;
export enum DamageType {
    Blunt = 'blunt',
    Pierce = 'pierce',
    Slash = 'slash',
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
    Active = 'active',
    Reactive = 'reactive',
}
