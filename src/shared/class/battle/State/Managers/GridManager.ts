import { RunService } from "@rbxts/services";
import { HexGridState, StateConfig, TILE_SIZE } from "shared/class/battle/types";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import HexCell from "../Hex/Cell";
import HexGrid from "../Hex/Grid";
import { ReadonlyGridState } from "../Hex/types";

/**
 * Manages the hexagonal grid for battle interactions
 */
export class GridManager {
    private logger = Logger.createContextLogger("GridManager");
    private grid: HexGrid;
    private eventBus?: EventBus;

    //#region Initialization

    /**
     * Creates a new grid manager with the specified configuration
     */
    constructor(config: StateConfig, eventBus?: EventBus) {
        this.eventBus = eventBus;
        this.grid = new HexGrid({
            radius: math.floor(config.width / 2),
            center: new Vector2(config.worldCenter.X, config.worldCenter.Z),
            size: TILE_SIZE,
            name: "BattleGrid",
        }, eventBus);
        this.grid.initialise();
    }

    //#endregion

    //#region Cell Access & Navigation

    /**
     * Get a specific cell at the provided q,r coordinates
     */
    public getCell(qr: Vector2): HexCell | undefined {
        return this.grid.getCell(qr);
    }

    /**
     * Get all cells in the grid
     */
    public getAllCells(): HexCell[] {
        return this.grid.cells;
    }

    /**
     * Get all unoccupied cells in the grid
     */
    public getVacantCells(): HexCell[] {
        return this.grid.cells.filter(cell => cell.isVacant());
    }

    /**
     * Get cells adjacent to the specified coordinates
     */
    public getAdjacentCells(qr: Vector2): HexCell[] {
        const neighbors = [
            new Vector2(qr.X + 1, qr.Y), // Right
            new Vector2(qr.X - 1, qr.Y), // Left
            new Vector2(qr.X, qr.Y + 1), // Down-right
            new Vector2(qr.X, qr.Y - 1), // Up-left
            new Vector2(qr.X + 1, qr.Y - 1), // Up-right
            new Vector2(qr.X - 1, qr.Y + 1), // Down-left
        ];

        return neighbors
            .mapFiltered(pos => this.getCell(pos))
            .filter((cell): cell is HexCell => cell !== undefined);
    }

    /**
     * Get all cells within a certain range of the target coordinates
     */
    public getCellsInRange(qr: Vector2, range: number): HexCell[] {
        const result: HexCell[] = [];

        for (const cell of this.getAllCells()) {
            if (this.findDistance(qr, cell.qr()) <= range) {
                result.push(cell);
            }
        }

        return result;
    }

    //#endregion

    //#region Pathfinding & Distance

    /**
     * Calculate distance between two points on the grid
     */
    public findDistance(a: Vector2, b: Vector2): number {
        return this.grid.findDistance(a, b);
    }

    /**
     * Check if there's a clear path from point A to B within a maximum distance
     * Returns the path if found, undefined otherwise
     */
    public findPath(start: Vector2, dest: Vector2, maxDistance?: number): Vector2[] | undefined {
        // Simple implementation - can be replaced with A* or other algorithms for better performance
        if (!this.isValidPosition(start) || !this.isValidPosition(dest)) return undefined;

        const startCell = this.getCell(start);
        const endCell = this.getCell(dest);
        if (!startCell || !endCell) return undefined;

        const distance = this.findDistance(start, dest);
        if (maxDistance !== undefined && distance > maxDistance) return undefined;

        // For simple cases, return direct line
        // In a real implementation, you'd check for obstacles and use a proper pathfinding algorithm
        return [start, dest];
    }

    //#endregion

    //#region Grid State Management

    /**
     * Get the current state of the grid
     */
    public getGridState(): ReadonlyGridState {
        return this.grid.info();
    }

    /**
     * Update the grid with new state data
     */
    public updateGrid(gridState: HexGridState): void {
        this.grid.update(gridState);

        // Only emit grid updated event on the server side
        // This ensures clients can't manipulate the game state
        if (this.eventBus && RunService.IsServer()) {
            this.logger.debug("Emitting grid updated event");
            this.eventBus.emit(GameEvent.GRID_UPDATED, gridState);
        }
    }

    //#endregion

    //#region Utility Methods

    /**
     * Check if the provided coordinates represent a valid position on the grid
     */
    public isValidPosition(qr: Vector2): boolean {
        return this.getCell(qr) !== undefined;
    }

    //#endregion

    public getGrid() {
        return this.grid;
    }
}