import { TweenService } from "@rbxts/services";
import { EntityStatus } from "shared/class/battle/types";
import Logger from "shared/utils/Logger";
import HexCellGraphics from "../../Hex/Cell/Graphics";
import AnimationHandler, { AnimationOptions, AnimationType } from "./AnimationHandler";
import AudioHandler from "./AudioHandler";
import Expression from "./Expression";
import TweenManager from "./TweenManager";

export default class EntityGraphics {
    private logger = Logger.createContextLogger("EntityGraphics");
    name: string;

    animationHandler: AnimationHandler;
    audioHandler: AudioHandler;
    tweenManager: TweenManager;

    template: Readonly<Model>;
    expression: Expression;
    model: Model;
    animator: Animator;
    nameTag: TextBox;

    constructor(template: Model) {
        this.template = template;
        this.model = template.Clone();
        this.model.Parent = game.Workspace;
        this.name = this.model.Name;
        const ntOBJ = this.model.FindFirstChild('nametag') || this.model.FindFirstChild("Essentials")?.FindFirstChild('nametag');
        this.nameTag = ntOBJ?.FindFirstChildOfClass('BillboardGui')?.FindFirstChild('TextBox') as TextBox; assert(this.nameTag, "[EntityGraphics] Name tag not found in model.");
        this.nameTag.Text = this.name;

        const humanoid = this.model.FindFirstChildWhichIsA("Humanoid") as Humanoid; assert(humanoid, "[EntityGraphics] Humanoid not found in model.");
        const animator = humanoid.FindFirstChildOfClass("Animator"); assert(animator?.IsA('Animator'), "[EntityGraphics] Animator not found in model.");
        this.animator = animator;

        this.expression = new Expression(this);
        const ah = AnimationHandler.Create(this); assert(ah, "[EntityGraphics] Animation handler not created");
        this.animationHandler = ah;
        this.audioHandler = new AudioHandler(this, template.Name);
        this.tweenManager = new TweenManager();
    }    // Damage indicators are now handled by CombatEffectsService

    //#region play animation/audio
    public playAnimation(id: AnimationType, opt: AnimationOptions): AnimationTrack | undefined {
        return this.animationHandler.playAnimation(id, opt);
    }

    public playAudio(entityStatus: EntityStatus) {
        if (!this.audioHandler) {
            this.logger.warn("Audio handler not initialised");
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
        this.logger.info(`${this.name}: Moving to position`, adjustedTargetPosition);

        const direction = (adjustedTargetPosition.sub(modelPrimaryPart.Position)).Unit;
        const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, modelPrimaryPart.Position.add(direction));

        // Create target CFrame with correct position and facing direction
        const targetCFrame = new CFrame(adjustedTargetPosition).mul(lookAtCFrame.sub(modelPrimaryPart.Position));

        if (direction.X !== direction.X || direction.Y !== direction.Y || direction.Z !== direction.Z) {
            this.logger.warn("Direction is NaN; bypassed already at position?", direction);
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

    public async moveToCell(cell: HexCellGraphics, path?: HexCellGraphics[]): Promise<void> {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid; assert(humanoid, "Humanoid not found");
        const humanoidRoot = humanoid.RootPart; assert(humanoidRoot, "Humanoid root part not found");

        this.logger.info(`${this.name}: Moving to cell ${cell.qrs}`);

        if (!path) path = [cell];

        this.playAnimation(AnimationType.Move, { animation: 'move', priority: Enum.AnimationPriority.Action, loop: true });
        for (const cell of path) {
            const targetPosition = cell.worldPosition();
            if (humanoidRoot.Position === targetPosition) continue;
            await this.moveToPosition(targetPosition);
        }
        this.animationHandler.killAnimation(AnimationType.Move);
        const transitionTrack = this.playAnimation(AnimationType.Transition, { animation: 'move->idle', priority: Enum.AnimationPriority.Action, loop: false });

        return new Promise((resolve) => {
            transitionTrack?.Ended.Once(() => {
                this.logger.info(`${this.name}: Movement complete`);
                resolve();
            }) ?? resolve();
        });
    }
    //#endregion

    //#region look at ...
    async faceEntity(entity: EntityGraphics) {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid");
        const modelPrimaryPart = humanoid?.RootPart;
        const targetPosition = entity.model?.PrimaryPart?.Position;

        assert(modelPrimaryPart, "Humanoid root part not found");
        assert(targetPosition, "Target position not found");

        const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, targetPosition);
        const dot = modelPrimaryPart.CFrame.LookVector.Dot(lookAtCFrame.LookVector);
        if (dot !== dot || dot > 0.999) {
            this.logger.warn("Dot product:", dot);

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

    //         return;
    //     }

    //     const myXY = this.cell
    //     if (!myXY) {

    //         return;
    //     }

    //     const closestEntity = entities.reduce((closestEntity, c) => {
    //         const closestEntityXY = closestEntity.cell?.qrs;
    //         const currentEntityXY = c.cell?.qrs;

    //         if (!closestEntityXY || !currentEntityXY) {

    //             return closestEntity;
    //         }

    //         const closestDistance = closestEntityXY.sub(myXY).Magnitude;
    //         const currentDistance = currentEntityXY.sub(myXY).Magnitude;

    //         return currentDistance < closestDistance ? c : closestEntity;
    //     }, entities[0]);

    //     if (closestEntity) {
    //         this.faceEntity(closestEntity);
    //     } else {

    //     }
    // }
    //#endregion
}