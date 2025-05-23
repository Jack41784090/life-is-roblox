import { RunService } from "@rbxts/services";
import { CellTerrain, HexCellState, HexGridConfig, HexGridState } from "shared/class/battle/types";
import { QR } from "shared/class/XY";
import { HEXAGON_HEIGHT, HEXAGON_MAGIC } from "shared/const";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import HexCell from "./Cell";
import { Hex, Layout } from "./Layout";

export default class HexGrid {
    private logger = Logger.createContextLogger("HexGrid");
    model?: Model;

    layout: Layout;
    cellsQR: QR<HexCell>;
    cells: Array<HexCell> = [];
    center: Vector2;
    size: number;
    name: string;
    radius: number;
    private eventBus?: EventBus;

    constructor(config: HexGridConfig, eventBus?: EventBus) {
        const { center, size, radius, name } = config;
        assert(size > 0, "Cell size must be a positive number.");
        assert(radius > 0, "Radius must be a positive number.");

        this.logger.info("Creating grid with", config);

        this.radius = radius;
        this.center = center;
        this.size = size;
        this.name = name;
        this.eventBus = eventBus;
        this.cellsQR = new QR<HexCell>(this.radius);
        this.layout = new Layout(
            Layout.pointy,
            new Vector2(
                HEXAGON_MAGIC * this.size,
                HEXAGON_MAGIC * this.size
            ),
            new Vector2(this.center.X, this.center.Y),
        )
        if (RunService.IsClient()) {
            this.model = new Instance("Model");
            this.model.Name = `BattleGrid-${this.name}`;
            this.model.Parent = game.Workspace;
        }
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
        this.logger.info("Initialising grid", this);
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
                    eventBus: this.eventBus
                });
                this.cells.push(cell);
                this.cellsQR.set(q, r, cell);
            }
        }

        // Emit grid updated event if EventBus is available
        if (this.eventBus) {
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.info());
        }
    }

    //#region Sync

    private updateAllCells(config: HexCellState[]) {
        this.cells = config.map(c => {
            const newCell = this.cellsQR.get(c.qr) || new HexCell({
                ...c,
                gridRef: this,
                eventBus: this.eventBus
            });
            this.cellsQR.set(c.qr.X, c.qr.Y, newCell);
            newCell.update(c);
            return newCell;
        });

        // Emit grid updated event if EventBus is available
        if (this.eventBus) {
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.info());
        }
    }

    private updateOneCell(q: number, r: number, config: Partial<HexCellState>) {
        const cell = this.cellsQR.get(q, r);
        if (cell) {
            cell.update(config);
        }
        else {
            this.logger.warn(`Cell Update failed: invalid qr(${q},${r})`);
        }
    }

    private updateCenter(center: Vector2) {
        const oldCenter = new Vector2(this.center.X, this.center.Y);
        this.center = center;
        this.layout = new Layout(
            Layout.pointy,
            new Vector2(
                HEXAGON_MAGIC * this.size,
                HEXAGON_MAGIC * this.size
            ),
            new Vector2(this.center.X, this.center.Y),
        );

        // Emit grid updated event if EventBus is available and center changed
        if (this.eventBus && oldCenter !== (center)) {
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.info());
        }
    }

    private updateRadius(radius: number) {
        if (this.radius === radius) return;

        this.radius = radius;

        this.cellsQR.reset(() => { });
        this.cellsQR = new QR<HexCell>(this.radius);
        this.cells = [];

        // Emit grid updated event if EventBus is available
        if (this.eventBus) {
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.info());
        }
    }

    /**
     * radius + cells:  complete change
     * cells:           individual cell change
     * center:          change layout
     * 
     * @param config 
     */
    public update(config: Partial<HexGridState>) {
        let changed = false;


        for (const [x, y] of pairs(config)) {
            if (x === 'cellsMap') continue; // cellsMap is not a property of the grid, but a derived property
            if (typeOf(y) === typeOf(this[x])) {
                if (this[x as keyof this] !== y) {
                    this[x as keyof this] = y as unknown as any;
                    changed = true;
                }
            }
        }

        if (config.center) {
            this.updateCenter(config.center);
            changed = true;
        }

        if (config.cells && config.radius) {
            this.updateRadius(config.radius);
            this.updateAllCells(config.cells);
            changed = true;
        }
        else if (config.radius) {
            this.updateRadius(config.radius);
            changed = true;
        }
        else if (config.cells) {
            this.updateAllCells(config.cells);
            changed = true;
        }

        // Emit grid updated event if EventBus is available and grid changed
        if (changed && this.eventBus) {
            this.eventBus.emit(GameEvent.GRID_UPDATED, this.info());
        }

        // this.cells.clear(); this.cellsQR.reset();
        // this.initialise();
        // if (RunService.IsClient()) this.materialise();
    }
    //#endregion

    //#region Get
    public findDistance(a: Vector2, b: Vector2): number
    public findDistance(a: HexCell, b: HexCell): number
    public findDistance(a: Vector3, b: Vector3): number
    public findDistance(a: Vector2 | HexCell | Vector3, b: Vector2 | HexCell | Vector3): number {
        const A = typeIs(a, 'Vector2') || typeIs(a, 'Vector3') ? a as Vector2 : (a as HexCell).qr();
        const B = typeIs(b, 'Vector2') || typeIs(b, 'Vector3') ? b as Vector2 : (b as HexCell).qr();

        const AHEX = new Hex(A.X, A.Y, -A.X - A.Y);
        const BHEX = new Hex(B.X, B.Y, -B.X - B.Y);

        return AHEX.distance(BHEX);
    }

    public findWorldPositionFromQRS(qrs: Vector2): Vector3
    public findWorldPositionFromQRS(qrs: Vector3): Vector3
    public findWorldPositionFromQRS(qrs: Vector2 | Vector3): Vector3 {
        const { X, Y } = this.layout.hexToPixel(new Hex(qrs.X, qrs.Y, -qrs.X - qrs.Y))
        return new Vector3(X, HEXAGON_HEIGHT, Y);
    }

    public getCell(v: Vector2): HexCell | undefined
    public getCell(q: number, r: number): HexCell | undefined
    public getCell(q: number | Vector2, r?: number): HexCell | undefined {
        let x = 0, y = 0;
        if (typeOf(q) === 'number') {
            x = q as number;
            y = r as number;
        } else if (typeOf(q) === 'Vector2') {
            const v = q as Vector2;
            x = v.X;
            y = v.Y;
        }

        const cell = this.cellsQR.get(x, y);


        return cell
    }

    public info(): HexGridState {
        return {
            center: this.center,
            radius: this.radius,
            size: this.size,
            name: this.name,
            cells: this.cells.map(c => c.info()),
            cellsMap: new Map(this.cells.map(c => {
                return [`${c.qr().X},${c.qr().Y}`, c.info()]
            })),
        }
    }
    //#endregion
}