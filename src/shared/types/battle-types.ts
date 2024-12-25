import { Atom } from "@rbxts/charm";
import Ability from "shared/class/battle/Ability";
import EntityHexCellGraphicsMothership from "shared/class/battle/ClientSide/EHCG/Mothership";
import Entity from "shared/class/battle/Entity";
import HexGrid from "shared/class/battle/Hex/Grid";
import State from "shared/class/battle/State";



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


export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,
    iconURL?: ReadinessIcon,
    model?: Instance,
    qr?: Vector2;
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
export type EntityStatsNoID = Omit<EntityStats, 'id'>;
export type EntityInitHardRequirements = {
    playerID: number;
    stats: EntityStats;
    hip: number;
    pos: number;
    org: number;
    sta: number;
}
export type EntityInit = Partial<iEntity> & EntityInitHardRequirements;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type EntityState = EntityInitHardRequirements & {
    name: string;
    team?: string;
    armed?: keyof typeof Enum.KeyCode;
    qr?: Vector2;
}

export type TeamState = { name: string; members: EntityState[] };

export type ReadinessIcon = {
    playerID: Readonly<number>,
    iconUrl: string;
    readiness: Atom<number>;
}

export enum CharacterActionMenuAction {
    EndTurn = 'endTurn',
    Move = 'move',
}

//#region Abilities
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
export type AbilityConfig = {
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
//#endregion




export interface CharacterMenuAction {
    type: CharacterActionMenuAction,
    run: () => void;
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
    actionType: ActionType,
    executed: boolean,
    by: PlayerID,
    against?: PlayerID,
}

export enum ActionType {
    Move = 'move',
    Attack = 'attack',
}
export interface AttackAction extends BattleAction {
    ability: Ability,
    clashResult?: ClashResult,
    abilityEffectString?: string,
}
export interface MoveAction extends BattleAction {
    from: Vector2,
    to: Vector2,
}

export interface ClashResult {
    damage: number,
    u_damage: number,
    fate: ClashResultFate,
    roll: number,
}

export type PlayerID = number


export type MainUIModes = 'onlyReadinessBar' | 'withSensitiveCells';
export type ReadinessRequestStatus = 'ReadyForReadinessCheck' | 'RequestWinner'

export type TeamMap = Record<string, Player[]>;
export type Config = {
    camera?: Camera,
    worldCenter: Vector3,
    width: number;
    height: number;
    teamMap: TeamMap
};


export const DEFAULT_WIDTH = 5;
export const DEFAULT_HEIGHT = 5;
export const DEFAULT_WORLD_CENTER = new Vector3(150, 0, 150);
export const TILE_SIZE = 10;

export interface EntityReadinessMap { [key: number]: Atom<number> }
export type ControlLocks = Map<Enum.KeyCode, boolean>

export type CellType = {
    material: Enum.Material;
    name: string;
    height: number;
}
export enum CellTerrain {
    hills,
    mountains,
    plains,
}

export interface PlayerData {
    readonly money: number;
}

export interface HexGridConfig {
    center: Vector2;
    radius: number;
    size: number;
    name: string;
}
export type HexGridState = HexGridConfig & {
    cells: Omit<HexCellConfig, 'gridRef'>[];
}

export interface HexCellConfig {
    qr: Vector2;
    size: number;
    height: number;
    terrain: CellTerrain;
    gridRef: HexGrid;
}
export type HexCellState = Omit<HexCellConfig, 'gridRef'> & {
    entity?: PlayerID;
}

export type StateState = {
    cre?: number,
    grid: ReturnType<HexGrid["info"]>;
    teams: { name: string; members: ReturnType<Entity["info"]>[] }[]
};

export interface ClientSideConfig {
    worldCenter: Vector3,
    size: number,
    width: number,
    height: number,
    camera: Camera
}

export interface StateConfig {
    teamMap: Record<string, Player[]>;
    width: number;
    worldCenter: Vector3;
}

export type UpdateMainUIConfig = {
    readinessIcons: ReadinessIcon[]
    EHCGMS: EntityHexCellGraphicsMothership,
    state: State,
    accessToken: AccessToken,
}

export interface AccessToken {
    readonly userId: number;
    readonly allowed: boolean;
    readonly token?: string;
    action?: BattleAction;
    newState?: StateState;
}

export type ActionValidator = {
    winningClient: Player,
    client: Player,
    declaredAccess: AccessToken,
    trueAccessCode: string
}