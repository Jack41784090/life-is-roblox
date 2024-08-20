import { getTween } from "shared/func";
import { CellInitOptions, CellTerrain } from "shared/types";

export default class Cell {
    static TWEEN_TIME = 0.5;
    part: Part;
    size = 4;
    xy: Vector2;
    terrain: CellTerrain;
    height: number;

    constructor(initOptions: CellInitOptions) {
        const { position, size, height, terrain, grid } = initOptions;
        this.xy = position;
        this.terrain = terrain;
        this.height = height;
        this.size = size;

        const part = new Instance("Part");
        part.Name = `Cell(${position.X}, ${position.Y})`;
        part.Size = new Vector3(
            this.size,
            height * this.size,
            this.size);
        part.Position = new Vector3(
            (position.X + grid.center.X - math.floor(grid.widthheight.X / 2)) * (this.size),
            this.size / 2,
            (position.Y + grid.center.Y - math.floor(grid.widthheight.Y / 2)) * (this.size));
        part.Anchored = true;
        part.Material = Enum.Material.Pebble;
        part.Parent = game.Workspace;
        part.Color
        this.part = part;
    }

    getMoveParticle() {
        const particle = new Instance("ParticleEmitter");
        particle.Parent = this.part;
        particle.Lifetime = new NumberRange(0.5, 0.5);
        particle.Rate = 2000;
        particle.Speed = new NumberRange(20, 20);
        particle.Transparency = new NumberSequence(0, 0);
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

    raiseHeight(height: number) {
        return new Promise((resolve) => {
            // print(`Raising height of ${this.part.Name} by ${height}`);
            if (height < 0 || height === this.height) {
                resolve(void 0);
            }

            const heightDiff = math.abs(this.height - height);
            const tweenTime = Cell.TWEEN_TIME * heightDiff;
            const tween = getTween(
                this.part,
                new TweenInfo(
                    tweenTime,
                    Enum.EasingStyle.Quad,
                    Enum.EasingDirection.Out
                ), {
                Size: new Vector3(this.part.Size.X, height * this.size, this.part.Size.Z),
                Position: new Vector3(
                    this.part.Position.X,
                    height * this.size / 2,
                    this.part.Position.Z
                )
            })
            const particle = this.getMoveParticle();
            const particle_tweenOut = getTween(
                particle,
                new TweenInfo(
                    tweenTime * 1.2,
                    Enum.EasingStyle.Exponential,
                    Enum.EasingDirection.Out
                ), {
                Rate: 0
            });
            tween.Play();
            particle_tweenOut.Play();
            particle_tweenOut.Completed.Connect(() => {
                particle.Destroy();
                this.height = height;
                resolve(void 0);
            });
        })
    }
}