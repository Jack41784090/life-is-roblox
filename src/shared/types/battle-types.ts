// // // Physical attributes
// // str: number,    // Strength: muscle density
// // dex: number,    // Dexterity: precision, skill with physical items and tools
// // spd: number,    // Speed: quickness
// // siz: number,    // Size: body mass
// // end: number,    // Endurance: stamina, resistance to fatigue

import Roact from "@rbxts/roact";
import Cell from "shared/class/Cell";
import Entity from "shared/class/Entity";

// // // Mental attributes
// // int: number,    // Intelligence: knowledge of pragmatic magic
// // spr: number,    // Spirit: connection to the spiritual world
// // fai: number,    // Faith: faith in the divine
// // wil: number,    // Willpower: mental strength
// // cha: number,    // Charisma: ability to influence others
// // beu: number,    // Beauty: physical appearance
export enum BotType {
    Player = 'player',
    Enemy = 'enemy',
}

export type ClashResultFate = "Miss" | "Hit" | "CRIT"

export enum Reality {
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
    { stats: Omit<EntityStats, 'id'>, playerID: number } // requirements: everything is optional exceot stats

export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,

    sta: number,
    hip: number,
    org: number,
    pos: number,

    iconURL?: ReadinessIcon,
    botType?: BotType,
    model?: Instance,
}

export type ReadinessIcon = {
    iconID: number,
    iconUrl: string;
    readiness: number;
}
export interface BattleConfig {
    size: number;
    camera: Camera,
    center: Vector2,
    width: number;
    height: number;
    teamMap: Record<string, Player[]>;
}

export enum ActionType {
    Attack = 'attack',
    Defend = 'defend',
    Move = 'move',
    Wait = 'wait',
}

export type EntityActionOptions = {
    type: ActionType,
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
    Light = 'light',
    Dark = 'dark',
    Arcane = 'arcane',
    Elemental = 'elemental',
    Occult = 'occult',
    Spiritual = 'spiritual',
    TheWay = 'theWay',
}

export interface iAbility {
    name: string;
    description: string;

    using?: Entity;
    target?: Entity;

    acc: number;
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;

    cost: {
        pos: number,
        mana: number,
    }

    // effects: Effect[];
}

export const potencyMap: Record<Potency, [keyof EntityStats, number][]> = {
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
    potencies: Map<Potency, number>;
    damageType: Map<DamageType, number>;
    using: Entity;
    target: Entity;
}

export interface Action {
    type: ActionType,
    run: (ui: Roact.Tree) => void;
}

export enum DropmenuActionType {
    Attack = 'Attack',
    MoveTo = 'Move To',
}

export interface DropmenuAction {
    name: DropmenuActionType,
    run: (contextCell: Cell) => void;
}
