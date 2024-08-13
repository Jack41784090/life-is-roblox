import { CellTerrain } from "shared/types";
import Cell from "./Cell";
import XY from "./XY";

export default class Grid {
    cells: Cell[] = [];
    cellsXY: XY<Cell>;

    constructor(public xy: Vector2, public center: Vector2, public size: number) {
        this.cellsXY = new XY<Cell>(xy.X, xy.Y);
    }

    area() {
        return this.xy.X * this.xy.Y;
    }

    materialise() {
        const grid = new Instance("Model");
        grid.Name = "Grid";
        grid.Parent = game.Workspace;

        for (let x = 0; x < this.xy.X; x++) {
            for (let y = 0; y < this.xy.Y; y++) {
                const cell = new Cell({
                    position: new Vector2(x, y),
                    size: this.size,
                    height: 1,
                    terrain: CellTerrain.plains,
                    grid: this
                });
                cell.part.Parent = grid;
                this.cellsXY.set(x, y, cell);
                this.cells.push(cell);
            }
        }
    }
}