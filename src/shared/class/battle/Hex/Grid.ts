import { RunService } from "@rbxts/services";
import { HEXAGON_HEIGHT, HEXAGON_MAGIC } from "shared/const";
import { CellTerrain, HexCellState, HexGridConfig, HexGridState } from "shared/types/battle-types";
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

    constructor(config: HexGridConfig) {
        const { center, size, radius, name } = config;
        assert(size > 0, "Cell size must be a positive number.");
        assert(radius > 0, "Radius must be a positive number.");

        print("Creating grid with", config);

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
        print("Initialising grid", this);
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
        print("Materialising grid", this);
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

    public getCell(v: Vector2): HexCell | undefined
    public getCell(q: number, r: number): HexCell | undefined
    public getCell(q: number | Vector2, r?: number): HexCell | undefined {
        if (typeOf(q) === 'number') {
            const x = q as number;
            return this.cellsQR.get(x, r as number);
        } else if (typeOf(q) === 'Vector2') {
            const v = q as Vector2;
            return this.cellsQR.get(v.X, v.Y);
        }
    }

    public info(): HexGridState {
        return {
            center: this.center,
            radius: this.radius,
            size: this.size,
            name: this.name,
            cells: this.cells.map(c => c.info())
        }
    }

    public updateAllCells(config: HexCellState[]) {
        this.cells = config.map(c => {
            const newCell = this.cellsQR.get(c.qr) || new HexCell({ ...c, gridRef: this });
            this.cellsQR.set(c.qr.X, c.qr.Y, newCell);
            newCell.update(c);
            return newCell;
        })
    }

    public updateOneCell(q: number, r: number, config: Partial<HexCellState>) {
        const cell = this.cellsQR.get(q, r);
        if (cell) {
            cell.update(config)
        }
        else {
            warn(`Cell Update failed: invalid qr(${q},${r})`);
        }
    }

    public updateCenter(center: Vector2) {
        this.center = center;
        this.layout = new Layout(
            Layout.pointy,
            new Vector2(
                HEXAGON_MAGIC * this.size,
                HEXAGON_MAGIC * this.size
            ),
            new Vector2(this.center.X, this.center.Y),
        );
    }

    public updateRadius(radius: number) {
        if (this.radius === radius) return;

        this.radius = radius;

        this.cellsQR.reset((cell) => cell.destroy());
        this.cellsQR = new QR<HexCell>(this.radius);
        this.cells = [];
    }

    /**
     * radius + cells:  complete change
     * cells:           individual cell change
     * center:          change layout
     * 
     * @param config 
     */
    public update(config: Partial<HexGridState>) {
        print("Updating grid with ", config);
        for (const [x, y] of pairs(config)) {
            if (typeOf(y) === typeOf(this[x])) this[x as keyof this] = y as unknown as any;
        }

        if (config.center) {
            this.updateCenter(config.center);
        }

        if (config.cells && config.radius) {
            this.updateRadius(config.radius);
            this.updateAllCells(config.cells);
        }
        else if (config.radius) {
            this.updateRadius(config.radius);
        }

        // this.cells.clear(); this.cellsQR.reset();
        // this.initialise();
        if (RunService.IsClient()) this.materialise();
    }
}