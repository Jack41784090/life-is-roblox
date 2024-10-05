import { CellTerrain } from "shared/types";
import HexCell from "./HexCell";
import XY from "./XY";

export default class HexGrid {
    cells: HexCell[] = [];
    cellsXY: XY<HexCell>;
    width: number;
    height: number;
    center: Vector2;
    size: number;
    name: string;


    constructor({ widthheight, center, size, name }: { widthheight: Vector2; center: Vector2; size: number; name: string; }) {
        if (widthheight.X <= 0 || widthheight.Y <= 0) {
            throw ("Grid dimensions must be positive numbers.");
        }
        this.cellsXY = new XY<HexCell>(widthheight.X, widthheight.Y);
        this.width = widthheight.X;
        this.height = widthheight.Y;
        this.center = center;
        this.size = size;
        this.name = name;
    }


    area() {
        return this.width * this.height;
    }

    async materialise() {
        print("Materialising grid");
        const grid = this;
        const gridModel = new Instance("Model");
        gridModel.Name = this.name;
        gridModel.Parent = game.Workspace;

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const q = x
                const r = y - (x + (x & 1)) / 2
                const cell = new HexCell({
                    qr: new Vector2(q, r),
                    size: this.size,
                    height: 0.125,
                    terrain: CellTerrain.plains,
                    grid,
                });

                cell.part.Parent = gridModel;
                this.cellsXY.set(x, y, cell);
                this.cells.push(cell);
            }
        }
    }

    getCell(position: Vector2): HexCell
    getCell(x: number, y: number): HexCell
    getCell(x: number | Vector2, y?: number) {
        if (typeOf(x) === 'Vector2') {
            const v = x as Vector2;
            return this.cellsXY.get(v.X, v.Y);
        }
        else {
            return this.cellsXY.get(x as number, y as number);
        }
    }
    getCellIsVacant(x: number, y: number) {
        return this.cellsXY.get(x, y)?.entity === undefined;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }
}