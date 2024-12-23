import { Entity } from "@rbxts/matter";
import { TweenService } from "@rbxts/services";
import { EntityStatus } from "shared/types/battle-types";
import EntityCellGraphicsTuple from "../../ClientSide/EHCG/Tuple";
import HexCellGraphics from "../../Hex/Cell/Graphics";
import AnimationHandler, { AnimationOptions } from "./AnimationHandler";
import AudioHandler from "./AudioHandler";
import Expression from "./Expression";
import TweenManager from "./TweenManager";

export default class EntityGraphics {
    name: string;

    animationHandler: AnimationHandler;
    audioHandler: AudioHandler;
    tweenManager: TweenManager;

    // iconURL: ReadinessIcon;
    // cell: HexCell;
    template: Readonly<Model>;
    expression: Expression;
    model: Model;
    animator: Animator;

    constructor(template: Model) {
        this.template = template;
        this.model = template.Clone();
        this.model.Parent = game.Workspace;
        this.name = this.model.Name;

        const humanoid = this.model.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        assert(humanoid, "[EntityGraphics] Humanoid not found in model.");
        const animator = humanoid.FindFirstChildOfClass("Animator");
        assert(animator?.IsA('Animator'), "[EntityGraphics] Animator not found in model.");
        this.animator = animator;

        this.expression = new Expression(this);
        this.animationHandler = new AnimationHandler(this);
        this.audioHandler = new AudioHandler(this, template.Name);
        this.tweenManager = new TweenManager();
    }

    public sync(entity: Entity) {

    }

    //#region play animation/audio
    public playAnimation({ animation, priority = Enum.AnimationPriority.Action, hold = 0, loop }: AnimationOptions): AnimationTrack | undefined {
        print(`${this.model.Name}: Playing animation ${animation}`);
        return this.animationHandler.playAnimation({ animation, priority, hold, loop });
    }

    public playAudio(entityStatus: EntityStatus) {
        if (!this.audioHandler) {
            warn("Audio handler not initialised");
            return;
        }
        this.audioHandler.play(entityStatus);
    }
    //#endregion

    //#region cell move

    public async moveToPosition(targetPosition: Vector3) {
        const modelPrimaryPart = this.model.PrimaryPart;
        assert(modelPrimaryPart, "Primary part not found in model");

        // Use the current Y position of the entity to avoid sinking into the ground
        const adjustedTargetPosition = new Vector3(targetPosition.X, modelPrimaryPart.Position.Y, targetPosition.Z);
        print(`${this.name}: Moving to position`, adjustedTargetPosition);

        const direction = (adjustedTargetPosition.sub(modelPrimaryPart.Position)).Unit;
        const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, modelPrimaryPart.Position.add(direction));

        // Create target CFrame with correct position and facing direction
        const targetCFrame = new CFrame(adjustedTargetPosition).mul(lookAtCFrame.sub(modelPrimaryPart.Position));

        if (direction.X !== direction.X || direction.Y !== direction.Y || direction.Z !== direction.Z) {
            warn("Direction is NaN; bypassed already at position?", direction);
            return;
        }

        // Tween to the new CFrame
        const tween = TweenService.Create(
            modelPrimaryPart,
            new TweenInfo(0.15, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: targetCFrame }
        );

        this.tweenManager.addTween(tween);
        return tween.Completed.Wait();
    }

    public async moveToCell(cell: HexCellGraphics, path?: HexCellGraphics[]): Promise<EntityCellGraphicsTuple> {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        assert(humanoid, "Humanoid not found");
        const humanoidRoot = humanoid.RootPart;
        assert(humanoidRoot, "Humanoid root part not found");

        print(`${this.name}: Moving to cell ${cell.qrs}`);

        if (!path) path = [cell];

        const moveTrack = this.playAnimation({ animation: 'move', priority: Enum.AnimationPriority.Action, loop: true });
        for (const cell of path) {
            const targetPosition = cell.worldPosition();
            if (humanoidRoot.Position === targetPosition) continue;
            await this.moveToPosition(targetPosition);
        }
        moveTrack?.Stop();
        const transitionTrack = this.playAnimation({ animation: 'move->idle', priority: Enum.AnimationPriority.Action, loop: false });

        return new Promise((resolve) => {
            transitionTrack?.Ended.Once(() => {
                print(`${this.name}: Movement complete`);
                resolve(new EntityCellGraphicsTuple(cell, this));
            });
        });
    }
    //#endregion

    //#region look at ...
    async faceEntity(entity: EntityGraphics) {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const modelPrimaryPart = humanoid?.RootPart;
        const targetPosition = entity.model?.PrimaryPart?.Position;

        assert(modelPrimaryPart, "Humanoid root part not found");
        assert(targetPosition, "Target position not found");

        const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, targetPosition);
        if (modelPrimaryPart.CFrame.LookVector.Dot(lookAtCFrame.LookVector) > 0.999) {
            // print("Already facing the entity", modelPrimaryPart.CFrame.LookVector, lookAtCFrame.LookVector);
            return;
        }

        // Tween to the new CFrame
        const tween = TweenService.Create(
            modelPrimaryPart,
            new TweenInfo(0.15, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: lookAtCFrame }
        );
        this.tweenManager.addTween(tween);
        return tween.Completed.Wait();
    }
    // private faceClosestEntity(entities: Entity[]) {
    //     if (entities.size() === 0) {
    //         warn("No other entities found");
    //         return;
    //     }

    //     const myXY = this.cell
    //     if (!myXY) {
    //         warn("Current entity coordinates not set");
    //         return;
    //     }

    //     const closestEntity = entities.reduce((closestEntity, c) => {
    //         const closestEntityXY = closestEntity.cell?.qrs;
    //         const currentEntityXY = c.cell?.qrs;

    //         if (!closestEntityXY || !currentEntityXY) {
    //             warn("Coordinates not set for entity");
    //             return closestEntity;
    //         }

    //         const closestDistance = closestEntityXY.sub(myXY).Magnitude;
    //         const currentDistance = currentEntityXY.sub(myXY).Magnitude;

    //         return currentDistance < closestDistance ? c : closestEntity;
    //     }, entities[0]);

    //     if (closestEntity) {
    //         this.faceEntity(closestEntity);
    //     } else {
    //         warn("No closest entity found");
    //     }
    // }
    //#endregion
}