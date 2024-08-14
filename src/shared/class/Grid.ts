import { CellTerrain } from "shared/types";
import Cell from "./Cell";
import XY from "./XY";

export default class Grid {
    cells: Cell[] = [];
    cellsXY: XY<Cell>;

    constructor(public widthheight: Vector2, public center: Vector2, public size: number, public name = "Grid") {
        this.cellsXY = new XY<Cell>(widthheight.X, widthheight.Y);
    }

    area() {
        return this.widthheight.X * this.widthheight.Y;
    }

    materialise() {
        const grid = new Instance("Model");
        grid.Name = this.name
        grid.Parent = game.Workspace;

        for (let x = 0; x < this.widthheight.X; x++) {
            for (let y = 0; y < this.widthheight.Y; y++) {
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