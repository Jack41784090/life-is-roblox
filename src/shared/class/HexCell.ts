import { HEXAGON } from "shared/const";
import { CellTerrain } from "shared/types";
import { getTween } from "shared/utils";
import Entity from "./Entity";
import HexGrid from "./HexGrid";
import { Hex, Layout } from "./Hexagon_Tutorial";


export default class HexCell {
    public static readonly SELECTED_COLOUR = new Color3(1, 58 / 255, 58 / 255);
    private static readonly TWEEN_TIME = 0.5;

    public glow = false;
    public part: UnionOperation;
    public size = 4;
    public qrs: Vector3;
    public terrain: CellTerrain;
    public height: number;
    public entity?: Entity;
    public grid: HexGrid;
    public layout: Layout;

    constructor(initOptions: {
        qr: Vector2;
        size: number;
        height: number;
        terrain: CellTerrain;
        grid: HexGrid;
        layout: Layout; // Pass the layout instance here
    }) {
        const { qr: qrs, size, height, terrain, layout } = initOptions;
        const { X: q, Y: r } = qrs;
        const s = -q - r;
        this.qrs = new Vector3(q, r, s);
        this.terrain = terrain;
        this.height = height;
        this.size = size;
        this.grid = initOptions.grid;
        this.layout = layout;

        // Create the hex cell part
        const part = HEXAGON.Clone();
        part.Name = `HexCell(${q},${r},${s})`;
        part.Size = part.Size.mul(this.size);

        // Convert the hex QR to world XY using the layout instance
        const worldPosition = this.layout.hexToPixel(new Hex(q, r, s));
        part.Position = new Vector3(worldPosition.x, this.height, worldPosition.y);

        part.Anchored = true;
        part.Material = Enum.Material.Pebble;
        part.Parent = game.Workspace;
        part.Color = new Color3(1, 1, 1); // Set default color or based on terrain
        this.part = part;
    }




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

    public raiseHeight(newHeight: number): Promise<void> {
        return new Promise((resolve) => {
            if (newHeight < 0 || newHeight === this.height) {
                resolve();
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
                resolve();
            });
        });
    }

    public isVacant(): boolean {
        return this.entity === undefined;
    }
}
