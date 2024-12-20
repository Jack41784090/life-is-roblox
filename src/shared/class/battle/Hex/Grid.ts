import { HEXAGON_HEIGHT, HEXAGON_MAGIC } from "shared/const";
import { CellTerrain, HexCellConfig, HexGridConfig } from "shared/types/battle-types";
import { QR } from "../../XY";
import HexCell from "./Cell";
import { Layout } from "./Layout";

export default class HexGrid {
    model?: Model;

    layout: Layout;
    cellsQR: QR<HexCell>;
    cells: Array<HexCell> = [];
    center: Vector2;
    size: number;
    name: string;
    radius: number;

    constructor({ center, radius, size, name }: HexGridConfig) {
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
        this.layout = new Layout(
            Layout.pointy,
            new Vector2(
                HEXAGON_MAGIC * this.size,
                HEXAGON_MAGIC * this.size
            ),
            new Vector2(this.center.X, this.center.Y),
        )
    }
    /**
     * Initializes the hexagonal grid with the specified radius.
     * This method creates hexagonal cells within the grid based on the radius,
     * and sets their properties such as size, height, terrain, and layout.
     * The cells are then added to the grid's cell collection.
     *
     * @remarks
     * The grid is initialized by iterating over a range of coordinates (q, r)
     * that define the hexagonal grid structure. Model is not yet initialised.
     */
    public initialise() {
        print("Initialising grid with radius");
        const grid = this;
        const radius = this.radius;

        for (let q = -radius; q <= radius; q++) {
            for (let r = math.max(-radius, -q - radius); r <= math.min(radius, -q + radius); r++) {
                const cell = new HexCell({
                    qr: new Vector2(q, r),
                    size: this.size,
                    height: HEXAGON_HEIGHT,
                    terrain: CellTerrain.plains,
                    gridRef: grid,
                });
                this.cells.push(cell);
                this.cellsQR.set(q, r, cell);
            }
        }
    }
    /**
     * Materialises the grid by creating a model in the game workspace and iterating through the grid cells.
     */
    public materialise() {
        print("Materialising grid with radius");
        const gridModel = this.model || new Instance("Model");
        gridModel.Name = this.name;
        gridModel.Parent = game.Workspace;
        this.model = gridModel;

        const radius = this.radius;
        for (let q = -radius; q <= radius; q++) {
            for (let r = math.max(-radius, -q - radius); r <= math.min(radius, -q + radius); r++) {
                const cell = this.cellsQR.get(q, r);
                if (cell) {
                    cell.materialise();
                }
            }
        }
    }

    getCell(v: Vector2): HexCell | undefined
    getCell(q: number, r: number): HexCell | undefined
    getCell(q: number | Vector2, r?: number): HexCell | undefined {
        if (typeOf(q) === 'number') {
            const x = q as number;
            return this.cellsQR.get(x, r as number);
        } else if (typeOf(q) === 'Vector2') {
            const v = q as Vector2;
            return this.cellsQR.get(v.X, v.Y);
        }
    }

    info(): HexGridConfig {
        return {
            center: this.center,
            radius: this.radius,
            size: this.size,
            name: this.name,
        }
    }

    updateCell(q: number, r: number, config: Partial<HexCellConfig>) {
        const cell = this.cellsQR.get(q, r);
        if (cell) {
            cell.update(config)
        }
        else {
            warn(`Cell Update failed: invalid qr(${q},${r})`);
        }
    }

    update(config: Partial<HexGridConfig>) {
        for (const [x, y] of pairs(config)) {
            if (typeOf(y) === typeOf(this[x])) {
                this[x as keyof this] = y as unknown as any;
            }

            if (x === 'radius') {
                this.cellsQR.reset();
                this.cellsQR = new QR<HexCell>(this.radius);
                this.initialise();
            }
            if (x === 'center') {
                this.layout = new Layout(
                    Layout.pointy,
                    new Vector2(
                        HEXAGON_MAGIC * this.size,
                        HEXAGON_MAGIC * this.size
                    ),
                    new Vector2(this.center.X, this.center.Y),
                )

                this.cellsQR.reset();
                this.cellsQR = new QR<HexCell>(this.radius);
                this.initialise();
            }
        }

        // this.cells.clear(); this.cellsQR.reset();
        // this.initialise();
        // this.materialise();
    }
}