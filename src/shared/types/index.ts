import Grid from "shared/class/Grid";

export type CellType = {
    material: Enum.Material;
    name: string;
    height: number;
}
export type CellInitOptions = {
    position: Vector2;
    size: number;
    height: number;
    terrain: CellTerrain;
    grid: Grid;
}
export enum CellTerrain {
    hills,
    mountains,
    plains,
}