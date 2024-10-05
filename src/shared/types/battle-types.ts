import Roact from "@rbxts/roact";
import BattleDDElement from 'gui_sharedfirst/components/battle/dropdown';
import Ability from "shared/class/Ability";
import Battle from "shared/class/Battle";
import Cell from "shared/class/Cell";
import Entity from "shared/class/Entity";

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
    { stats: Omit<EntityStats, 'id'>, playerID: number, battle: Battle } // requirements: everything is optional exceot stats

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
    worldCenter: Vector3,
    width: number;
    height: number;
    teamMap: Record<string, Player[]>;
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

    range: {
        min: number,
        max: number,
    }

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
    range: { min: number; max: number; };
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
    PlayerMovement = 'playerMovement',
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


//#region Dropdown Menu Types
export interface OnClickChain {
    isHovering: boolean;
    isRendering: boolean;
    render: (ctx: DropdownmenuContext) => Roact.Element;
}
export enum DropmenuActionType {
    Attack = 'Attack',
    MoveTo = 'Move To',
    EndTurn = 'End Turn',
}
export interface DropdownmenuContext {
    occ: DropmenuAction;
    cell: Cell;
    initiator: Entity;
    dropdownMenu: BattleDDElement;
}
export interface DropmenuAction {
    name: DropmenuActionType,
    run: (ctx: DropdownmenuContext) => void;
    onClickChain?: OnClickChain
}
//#endregion
