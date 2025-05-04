import { Atom } from "@rbxts/charm";
import EntityHexCellGraphicsMothership from "shared/class/battle/ClientSide/EHCG/Mothership";
import { ActiveAbilityState, ReactionUpdate } from "shared/class/battle/State/Ability/types";
import { EntityState } from "shared/class/battle/State/Entity/types";
import { GameState } from "shared/class/battle/State/GameState";
import HexGrid from "shared/class/battle/State/Hex/Grid";



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
    type: ActionType,
    executed: boolean,
    by: PlayerID,
    against?: PlayerID,
}

export enum ActionType {
    Move = 'move',
    Attack = 'attack',
}
export interface AttackAction extends BattleAction {
    ability: ActiveAbilityState,
    clashResult: ClashResult,
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
    defendAttemptSuccessful: boolean,
    defendAttemptName: string,
    defendReactionUpdate: ReactionUpdate,
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
    cellsMap: Map<`${number},${number}`, HexCellState>;
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
    teams: { name: string; members: EntityState[] }[]
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
    state: GameState,
    accessToken: AccessToken,
}

export interface AccessToken {
    readonly userId: number;
    readonly allowed: boolean;
    readonly token?: string;
    action?: BattleAction;
    mes?: string;
}

export type ActionValidator = {
    winningClient: Player,
    client: Player,
    declaredAccess: AccessToken,
    trueAccessCode: string
}