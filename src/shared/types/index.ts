import Gui from "shared/class/battle/ClientSide/Gui";

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

export interface ClientSideConfig {
    worldCenter: Vector3, size: number, width: number, height: number, camera: Camera
}

export interface AccessToken {
    readonly userId: number;
    readonly allowed: boolean;
    readonly token?: string;
    readonly action?: string;
}

export type GuiFunction = keyof Gui
