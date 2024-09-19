import { ReplicatedStorage } from "@rbxts/services";
import { getTween, gridXYToWorldXY } from "shared/func";
import { CellInitOptions, CellTerrain } from "shared/types";
import Entity from "./Entity";
import Grid from "./Grid";

export default class Cell {
    public static readonly SELECTED_COLOUR = new Color3(1, 58 / 255, 58 / 255);
    private static readonly TWEEN_TIME = 0.5;
    private static readonly HEXAGON = ReplicatedStorage.WaitForChild("Hexagon") as UnionOperation;

    public glow = false;
    public part: UnionOperation;
    public size = 4;
    public xy: Vector2;
    public terrain: CellTerrain;
    public height: number;
    public entity?: Entity;
    public grid: Grid;

    private shiftingXY: boolean;

    constructor(initOptions: CellInitOptions) {
        const { position, size, height, terrain } = initOptions;
        this.xy = position;
        this.terrain = terrain;
        this.height = height;
        this.size = size;
        this.grid = initOptions.grid;
        this.shiftingXY = initOptions.position.X % 2 === 1;

        const part = Cell.HEXAGON.Clone();
        part.Name = `Cell(${position.X}, ${position.Y})`;
        part.Size = new Vector3(this.size, height, this.size);
        part.Position = gridXYToWorldXY(position, this.grid);
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
            const tweenTime = Cell.TWEEN_TIME * heightDifference;

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
