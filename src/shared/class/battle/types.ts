import { Atom } from "@rbxts/charm";
import { EntityState } from "shared/class/battle/State/Entity/types";
import HexGrid from "shared/class/battle/State/Hex/Grid";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import State from "./State";
import { StrikeSequence, TriggerModify } from "./Systems/CombatSystem/types";



export type TeamState = { name: string; members: EntityState[] };

export type ReadinessIcon = {
    playerID: Readonly<number>,
    iconUrl: string;
    readiness: Atom<number>;
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
    ResolveAttacks = 'clash-results',
    Move = 'move',
    Attack = 'attack',
    StyleSwitch = "StyleSwitch",
}
export interface StyleSwitchAction extends BattleAction {
    styleIndex: number,
}

export interface ResolveAttacksAction extends BattleAction {
    results: (StrikeSequence | TriggerModify)[],
    ability: ActiveAbilityState,
}
export interface AttackAction extends BattleAction {
    ability: ActiveAbilityState,
}
export interface MoveAction extends BattleAction {
    from: Vector2,
    to: Vector2,
}

export type PlayerID = number

export type ReadinessRequestStatus = 'ReadyForReadinessCheck' | 'RequestWinner'

export type TeamMap = Record<string, Player[]>;
export type BattleConfig = {
    camera?: Camera,
    gs: State;
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
}