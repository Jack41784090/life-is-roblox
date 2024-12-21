import { HEXAGON } from "shared/const/assets";
import { CellTerrain, HexCellConfig, HexCellState, PlayerID } from "shared/types/battle-types";
import { getTween } from "shared/utils";
import HexGrid from "./Grid";
import { Hex } from "./Layout";

export default class HexCell {
    public static readonly SELECTED_COLOUR = new Color3(1, 58 / 255, 58 / 255);
    private static readonly TWEEN_TIME = 0.5;

    public qrs: Vector3;
    public terrain: CellTerrain;
    public entity?: PlayerID;

    public part?: UnionOperation;
    public size = 4;
    public height: number;
    public gridRef: HexGrid;

    constructor({ qr: qrs, size, height, terrain, gridRef }: HexCellConfig) {
        const { X: q, Y: r } = qrs;
        const s = -q - r;
        this.qrs = new Vector3(q, r, s);
        this.terrain = terrain;
        this.height = height;
        this.size = size;
        this.gridRef = gridRef;
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
    public materialise() {
        const { X: q, Y: r, Z: s } = this.qrs;
        warn(this.part === undefined, "Part already exists for this cell", this);
        const part = this.part || HEXAGON.Clone();
        this.part = part;

        part.Name = `HexCell(${q},${r},${s})`;
        part.Size = HEXAGON.Size.mul(this.size);

        // Convert the hex QR to world XY using the layout instance
        const worldPosition = this.gridRef.layout.hexToPixel(new Hex(q, r, s));
        part.Position = new Vector3(worldPosition.X, this.height, worldPosition.Y);

        part.Anchored = true;
        part.Material = Enum.Material.Pebble;
        part.Parent = this.gridRef.model;
        part.Color = new Color3(1, 1, 1); // Set default color or based on terrain

        print(`Materialised cell ${this.qrs} at ${part.Position}`, this);
    }

    public destroy() {
        // this.entity?.model?.Destroy();
        // this.entity = undefined;
        warn(`Destroying cell ${this.qrs}`);
        this.part?.Destroy();
        this.part = undefined;
    }

    public update(config: Partial<HexCellState>) {
        print(`Updating cell ${this.qrs} with config`, config);
        for (const [x, y] of pairs(config)) {
            this[x as keyof this] = y as unknown as any;
        }
    }
    //#endregion

    //#region Get Info

    public qr(): Vector2 {
        return new Vector2(this.qrs.X, this.qrs.Y);
    }

    public worldPosition(): Vector3 {
        if (this.part === undefined) {
            return new Vector3();
        }
        return this.part.Position;
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

    //#region ANIMATIONS
    private createMoveParticle(): ParticleEmitter {
        const particle = new Instance("ParticleEmitter");
        particle.Parent = this.part;
        particle.Lifetime = new NumberRange(0.5);
        particle.Rate = 2000;
        particle.Speed = new NumberRange(20);
        particle.Transparency = new NumberSequence(0);
        particle.SpreadAngle = new Vector2(180, 360);
        particle.Texture = "rbxassetid://18927743601";
        particle.ShapeStyle = Enum.ParticleEmitterShapeStyle.Surface;
        particle.Size = new NumberSequence(0.1, 0.15);
        particle.EmissionDirection = Enum.NormalId.Top;
        particle.ShapeInOut = Enum.ParticleEmitterShapeInOut.Outward;
        particle.Drag = 4.5;
        particle.Acceleration = new Vector3(0, -10, 0);
        particle.LockedToPart = true;
        return particle;
    }

    public raiseHeight(newHeight: number): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (newHeight < 0 || newHeight === this.height) {
                reject("Invalid height");
                return;
            }
            else if (this.part === undefined) {
                reject("Part not found");
                return;
            }

            const heightDifference = math.abs(this.height - newHeight);
            const tweenTime = HexCell.TWEEN_TIME * heightDifference;

            const targetSize = new Vector3(
                this.part.Size.X,
                newHeight * this.size,
                this.part.Size.Z
            );

            const targetPosition = new Vector3(
                this.part.Position.X,
                (newHeight * this.size) / 2,
                this.part.Position.Z
            );

            const tween = getTween(
                this.part,
                new TweenInfo(
                    tweenTime,
                    Enum.EasingStyle.Quad,
                    Enum.EasingDirection.Out
                ),
                {
                    Size: targetSize,
                    Position: targetPosition,
                }
            );

            const particle = this.createMoveParticle();
            const particleTweenOut = getTween(
                particle,
                new TweenInfo(
                    tweenTime * 1.2,
                    Enum.EasingStyle.Exponential,
                    Enum.EasingDirection.Out
                ),
                { Rate: 0 }
            );

            tween.Play();
            particleTweenOut.Play();

            particleTweenOut.Completed.Connect(() => {
                particle.Destroy();
                this.height = newHeight;
                resolve(void 0);
            });
        });
    }
    //#endregion
}
