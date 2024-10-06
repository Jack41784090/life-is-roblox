import { HEXAGON_MAGIC } from "shared/const";
import { CellTerrain } from "shared/types";
import { Layout, Point } from "./Hexagon_Tutorial";
import HexCell from "./HexCell";
import { QR } from "./XY";

export default class HexGrid {
    cellsQR: QR<HexCell>;
    cells: HexCell[] = [];
    center: Vector2;
    size: number;
    name: string;
    radius: number;

    constructor({ center, radius, size, name }: {
        center: Vector2;
        radius: number;
        size: number;
        name: string;
    }) {
        if (size <= 0) {
            throw ("Cell size must be a positive number.");
        }
        if (radius <= 0) {
            throw ("Radius must be a positive number.");
        }

        this.radius = radius;
        this.center = center;
        this.size = size;
        this.name = name;
        this.cellsQR = new QR<HexCell>(this.radius);
    }

    async materialise() {
        print("Materialising grid with radius");
        const grid = this;
        const gridModel = new Instance("Model");
        gridModel.Name = this.name;
        gridModel.Parent = game.Workspace;
        const radius = this.radius;

        for (let q = -radius; q <= radius; q++) {
            for (let r = math.max(-radius, -q - radius); r <= math.min(radius, -q + radius); r++) {
                const s = -q - r;
                const cell = new HexCell({
                    qr: new Vector2(q, r),
                    size: this.size,
                    height: 0.125,
                    terrain: CellTerrain.plains,
                    grid,
                    layout: new Layout(
                        Layout.pointy,
                        new Point(
                            HEXAGON_MAGIC * this.size,
                            HEXAGON_MAGIC * this.size
                        ),
                        new Point(this.center.X, this.center.Y),
                    )
                });
                cell.part.Parent = gridModel;
                this.cells.push(cell);
                this.cellsQR.set(q, r, cell);
            }
        }
    }

    getCell(q: number, r: number): HexCell | undefined {
        const cell = this.cellsQR.get(q, r);
        return cell
    }
}