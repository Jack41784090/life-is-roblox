import { ReplicatedStorage, TweenService } from "@rbxts/services";
import TweenManager from "shared/class/battle/Entity/Graphics/TweenManager";
import { TWEEN_TIME } from "shared/const";
import { HEXAGON } from "shared/const/assets";
import { getTween } from "shared/utils";

export default class HexCellGraphics {
    private tweenManager: TweenManager = new TweenManager();
    public part: UnionOperation;
    public size = 4;
    public height: number;
    public qr: Vector2;
    public qrs: Vector3
    public bloodPool: SurfaceGui;

    constructor({ qr, height, size, worldPosition, parent }: { qr: Vector2, height: number, size: number, parent: Model, worldPosition: Vector2 | Vector3 }) {
        this.qr = qr;

        this.qrs = new Vector3(qr.X, qr.Y, -qr.X - qr.Y);
        const { X: q, Y: r, Z: s } = this.qrs

        this.height = height;
        this.size = size;
        this.part = HEXAGON.Clone();
        this.part.Name = `HexCell(${q},${r},${s})`;
        this.part.Size = HEXAGON.Size.mul(this.size);
        this.part.Parent = parent;
        this.part.Position = typeIs(worldPosition, 'Vector3') ?
            worldPosition :
            new Vector3(worldPosition.X, height, worldPosition.Y);

        this.part.Anchored = true;
        this.part.Material = Enum.Material.Pebble;
        this.part.Color = new Color3(1, 1, 1);

        const hpPool = ReplicatedStorage.FindFirstChild("HPPool");
        assert(hpPool?.IsA('SurfaceGui'), "[EntityGraphics] HP pool not found in model.");
        this.bloodPool = hpPool;
        this.bloodPool.Adornee = this.part;
        const poolFrame = this.bloodPool.WaitForChild("Pool") as Frame;
        assert(poolFrame?.IsA('Frame'), "[EntityGraphics] HP pool frame not found in model.");
        poolFrame.Size = UDim2.fromScale(0, 0);

        print(`Materialised cell ${this.qrs} at ${this.part.Position}`, this);
    }

    public destroy() {
        this.part.Destroy();
    }

    public worldPosition(): Vector3 {
        if (this.part === undefined) {
            return new Vector3();
        }
        return this.part.Position;
    }

    //#region Animation
    private changeHPPoolSize(size: UDim2) {
        const hpPoolFrame = this.bloodPool.WaitForChild("Pool") as Frame;
        this.tweenManager.addTween(TweenService.Create(
            hpPoolFrame,
            new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { Size: size }
        ));
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
            const tweenTime = TWEEN_TIME * heightDifference;

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