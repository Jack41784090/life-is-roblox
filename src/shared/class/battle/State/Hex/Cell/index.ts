import { CellTerrain, HexCellConfig, HexCellState, PlayerID } from "shared/class/battle/types";
import { EventBus, GameEvent } from "../../../Events/EventBus";
import Entity from "../../Entity";
import HexGrid from "../Grid";
import { Hex } from "../Layout";

export default class HexCell {
    public qrs: Vector3;
    public terrain: CellTerrain;
    public entity?: PlayerID;
    public gridRef: HexGrid;
    public size = 4;
    public height: number;
    private eventBus?: EventBus;

    constructor({ qr: qrs, height, size, terrain, gridRef, eventBus }: HexCellConfig & { eventBus?: EventBus }) {
        const { X: q, Y: r } = qrs;
        const s = -q - r;
        this.qrs = new Vector3(q, r, s);
        this.terrain = terrain;
        this.gridRef = gridRef;
        this.size = size;
        this.height = height;
        this.eventBus = eventBus;
    }

    public static readonly directions = [
        new Vector3(1, -1, 0),  // Direction 1
        new Vector3(1, 0, -1),  // Direction 2
        new Vector3(0, 1, -1),  // Direction 3
        new Vector3(-1, 1, 0),  // Direction 4
        new Vector3(-1, 0, 1),  // Direction 5
        new Vector3(0, -1, 1),  // Direction 6
    ];

    //#region Modifying
    public pairWith(cre: Entity) {
        const previousEntity = this.entity;
        this.entity = cre.playerID;

        // Emit cell updated event if EventBus is available and entity changed
        if (this.eventBus && previousEntity !== this.entity) {
            this.eventBus.emit(GameEvent.GRID_CELL_UPDATED, {
                cell: this,
                previousEntity: previousEntity,
                newEntity: this.entity,
                position: this.qr()
            });
        }
    }

    public update(config: Partial<HexCellState>) {
        let changed = false;
        const previousState = this.info();

        for (const [x, y] of pairs(config)) {
            if (typeOf(this[x as keyof this]) === typeOf(y)) {
                if (this[x as keyof this] !== y) {
                    this[x as keyof this] = y as unknown as any;
                    changed = true;
                }
            }
            else if (x === 'entity' && this.entity !== y) {
                this.entity = y as number;
                changed = true;
            }
        }

        // Emit cell updated event if EventBus is available and cell changed
        if (changed && this.eventBus) {
            this.eventBus.emit(GameEvent.GRID_CELL_UPDATED, {
                cell: this,
                previousState,
                newState: this.info(),
                position: this.qr()
            });
        }
    }
    //#endregion

    //#region Get Info

    public qr(): Vector2 {
        return new Vector2(this.qrs.X, this.qrs.Y);
    }

    public findNeighbors(): HexCell[] {
        const neighbors: HexCell[] = [];
        for (const direction of HexCell.directions) {
            const neighborPos = this.qrs.add(direction);  // Add the direction vector to current qrs
            const neighbor = this.gridRef.getCell(neighborPos.X, neighborPos.Y);
            if (neighbor) neighbors.push(neighbor);
        }
        return neighbors;
    }

    public findCellsWithinRange(range: NumberRange): HexCell[]
    public findCellsWithinRange(min: number, max: number): HexCell[]
    public findCellsWithinRange(min: number | NumberRange, max?: number): HexCell[] {
        let range: NumberRange;
        if (typeOf(min) === 'number') {
            range = new NumberRange(min as number, max!);
        } else {
            range = min as NumberRange;
        }

        return this.findCellsWithinDistance(range.Max).filter(cell => {
            const hex = new Hex(cell.qrs.X, cell.qrs.Y, cell.qrs.Z);
            const thisHex = new Hex(this.qrs.X, this.qrs.Y, this.qrs.Z);
            const distance = hex.distance(thisHex);
            return distance >= range.Min
        });
    }

    public findCellsWithinDistance(distance: number): HexCell[] {
        // print(`Finding cells within distance ${distance} of ${this.qrs}`);
        const thisHex = new Hex(this.qrs.X, this.qrs.Y, this.qrs.Z);
        const cells = this.gridRef.cells.sort((a, b) => {
            const aHex = new Hex(a.qrs.X, a.qrs.Y, a.qrs.Z);
            const bHex = new Hex(b.qrs.X, b.qrs.Y, b.qrs.Z);
            return aHex.distance(thisHex) < bHex.distance(thisHex)
        });

        const result = [];
        for (const cell of cells) {
            const hex = new Hex(cell.qrs.X, cell.qrs.Y, cell.qrs.Z);
            // print(`${cell.qrs} distance: ${hex.distance(thisHex)}`);
            if (hex.distance(thisHex) <= distance) {
                result.push(cell);
            }
            else {
                break;
            }
        }

        // print("result", result.map(cell => cell.qrs));
        return result;
    }

    public isWithinRangeOf(cell: HexCell, range: NumberRange): boolean {
        const hex = new Hex(cell.qrs.X, cell.qrs.Y, cell.qrs.Z);
        const thisHex = new Hex(this.qrs.X, this.qrs.Y, this.qrs.Z);
        return hex.distance(thisHex) >= range.Min && hex.distance(thisHex) <= range.Max;
    }

    public isVacant(): boolean {
        return this.entity === undefined;
    }

    public info(): HexCellState {
        return {
            qr: this.qr(),
            size: this.size,
            height: this.height,
            terrain: this.terrain,
            entity: this.entity,
        }
    }
    //#endregion

}
