import Roact from "@rbxts/roact";
import Ability from "shared/class/Battle/Ability";
import Entity from "shared/class/Battle/Entity";

export enum BotType {
    Player = 'player',
    Enemy = 'enemy',
}

export type ClashResultFate = "Miss" | "Hit" | "CRIT"

export enum Reality {
    HP = 'hp',
    Force = 'force',
    Mana = 'mana',
    Spirituality = 'spirituality',
    Divinity = 'divinity',
    Precision = 'precision',
    Maneuver = 'maneuver',
    Convince = 'convince',
    Bravery = 'bravery',
}

export type EntityInitRequirements =
    Partial<iEntity> &
    {
        stats: Omit<EntityStats, 'id'>, playerID: number,
        hip: number,
        pos: number,
        org: number,
        sta: number,
    } // requirements: everything is optional exceot stats

export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,

    iconURL?: ReadinessIcon,
    botType?: BotType,
    model?: Instance,
}

export type ReadinessIcon = {
    iconID: number,
    iconUrl: string;
    readiness: number;
}

export enum CharacterActionMenuAction {
    EndTurn = 'endTurn',
    Move = 'move',
}

export type EntityActionOptions = {
    type: CharacterActionMenuAction,
    ui: Roact.Tree
}

export type EntityStats = {
    id: string;
    str: number;
    dex: number;
    acr: number;
    spd: number;
    siz: number;
    int: number;
    spr: number;
    fai: number;
    cha: number;
    beu: number;
    wil: number;
    end: number;
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

    // effects: Effect[];
}

export type AbilityKey = Enum.KeyCode.Q | Enum.KeyCode.W | Enum.KeyCode.E | Enum.KeyCode.R;

export type AbilitySet = {
    [key in keyof typeof Enum.KeyCode]?: iAbility;
};

export const potencyMap: Record<Potency, [keyof EntityStats, number][]> = {
    [Potency.Strike]: [
        ['str', 1]
    ],
    [Potency.Slash]: [
        ['str', 1]
    ],
    [Potency.Stab]: [
        ['str', 1]
    ],
    [Potency.TheWay]: [
        ['fai', 1.1]
    ],
    [Potency.Light]: [
        ['fai', .4],
        ['wil', .6],
    ],
    [Potency.Dark]: [
        ['cha', .25],
        ['wil', .75],
    ],
    [Potency.Arcane]: [
        ['int', .85],
        ['wil', .15],
    ],
    [Potency.Elemental]: [
        ['int', .65],
        ['spr', .35],
    ],
    [Potency.Occult]: [
        ['wil', .1],
        ['spr', .4],
        ['cha', .5],
    ],
    [Potency.Spiritual]: [
        ['spr', .9],
        ['wil', .1],
    ],
}

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

export type AbilityInitOptions = {
    name: string;
    description: string;
    acc: number;
    cost: { pos: number; mana: number; };
    range: NumberRange;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    using: Entity;
    target: Entity;
    animation: string;
    icon: string;
}

export interface CharacterMenuAction {
    type: CharacterActionMenuAction,
    run: (ui: Roact.Tree) => void;
}

export enum EntityStatus {
    Idle = 'idle',
}

export enum BattleStatus {
    Inactive = 'inactive',
    Begin = 'begin',
    RunReadiness = 'runReadiness',
    CameraTravel = 'cameraTravel',
    SelectAction = 'selectAction',
    MovementMode = 'playerMovement',
    PlayingAnimation = 'playingAnimation',
}

export interface BattleAction {
    executed: boolean,
}
export interface AttackAction extends BattleAction {
    ability: Ability,
    clashResult?: ClashResult,
    abilityEffectString?: string,
}

export interface ClashResult {
    damage: number,
    u_damage: number,
    fate: ClashResultFate,
    roll: number,
}
