import { ReplicatedStorage, TweenService } from "@rbxts/services";
import { gridXYToWorldXY } from "shared/func";
import { ActionType, BotType, EntityInitRequirements, EntityStats, EntityStatus, iEntity, ReadinessIcon } from "shared/types/battle-types";
import BattleGUI from "./BattleGui";
import Cell from "./Cell";
import Expression from "./Expression";

export default class Entity implements iEntity {
    // animations
    idleAnimationTrack?: AnimationTrack;
    idleAnimation?: Animation;
    blinkAnimationTrack?: AnimationTrack;
    blinkAnimation?: Animation;

    // audios
    idleSelectAudio?: Sound;

    playerID: number;
    iconURL?: ReadinessIcon;
    cell: Cell | undefined;

    readonly stats: Readonly<EntityStats>;
    team?: string;
    name: string;

    sta: number;
    hip: number;
    org: number;
    pos: number;

    botType: BotType = BotType.Enemy;

    expression?: Expression;
    template?: Model;
    model?: Model;
    animator?: Animator;

    constructor(options: EntityInitRequirements) {
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = options.sta ?? 0;
        this.hip = options.hip ?? 0;
        this.org = options.org ?? 0;
        this.pos = options.pos ?? 0;
        this.name = options.name ?? options.stats.id;
        this.botType = options.botType || BotType.Enemy;


        const id = this.stats.id;
        this.template = ReplicatedStorage.WaitForChild(`entity_${id}`) as Model;

        // init animations
        const animFolder = this.template.WaitForChild("anim") as Folder;
        this.idleAnimation = animFolder.WaitForChild("idle") as Animation;
        this.blinkAnimation = animFolder.WaitForChild("blink") as Animation;

        // init audios
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder;
        if (!audioFolder) {
            warn("Audio folder not found");
            return;
        }
        const entityAudio = audioFolder.FindFirstChild("entity") as Folder;
        if (!entityAudio) {
            warn("Entity audio folder not found");
            return;
        }

        const thisEntityAudio = entityAudio.FindFirstChild(this.stats.id) as Folder;
        if (!thisEntityAudio) {
            warn(`audio for ${this.stats.id} not found`);
            return;
        }

        this.idleSelectAudio = thisEntityAudio.FindFirstChild('idle') as Sound;
        if (!this.idleSelectAudio) {
            warn("Idle select audio not found");
        }

        print(`this.idleSelectAudio: ${this.idleSelectAudio}`);
    }

    playAudio(entityStatus: EntityStatus) {
        switch (entityStatus) {
            case EntityStatus.idle:
                this.idleSelectAudio?.Play();
        }
    }

    setCell(cell: Cell) {
        this.cell = cell;
        cell.entity = this;
    }

    materialise() {
        if (!this.cell) {
            warn("Coordinates not set");
            return;
        }

        const entity = this.template?.Clone();
        if (!entity) {
            warn("Entity template not found");
            return;
        }

        if (entity.IsA("BasePart")) {
            this.positionBasePart(entity);
        } else if (entity.IsA("Model")) {
            this.positionModel(entity);
        }

        entity.Parent = this.cell.part;
        this.model = entity;

        if (this.idleAnimation) {
            const humanoid = entity.WaitForChild("Humanoid") as Humanoid;
            const animator = humanoid?.WaitForChild("Animator") as Animator
            this.animator = animator;
            if (animator) {
                this.idleAnimationTrack = animator.LoadAnimation(this.idleAnimation);
                this.idleAnimationTrack.Looped = true;
                this.idleAnimationTrack.Play();
            }
        }
        this.expression = new Expression(this);

        task.spawn(() => {
            while (true) {
                this.expression?.blink();
                wait(math.random(1, 5));
            }
        })

        return this.model;
    }

    private positionBasePart(entity: BasePart) {
        entity.Position = this.cell!.part.Position.add(new Vector3(0, this.cell!.height * this.cell!.size, 0));
    }

    private positionModel(entity: Model) {
        const primaryPart = entity.PrimaryPart;
        if (!primaryPart) {
            throw `PrimaryPart is not set for the model entity_${this.stats.id}`;
        }
        const position = this.cell!.part.Position.add(new Vector3(0, this.cell!.height * this.cell!.size, 0));
        entity.PivotTo(new CFrame(position));
    }

    getActions(): { type: ActionType, action: () => void }[] {
        return [
            { type: ActionType.Move, action: () => print("Move") },
        ]
    }

    async moveToCell(cell: Cell, path: Vector2[]) {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const modelPrimaryPart = humanoid?.RootPart;
        if (!modelPrimaryPart || !humanoid) {
            warn("Model not materialised", modelPrimaryPart, humanoid);
            return;
        }

        if (this.cell) {
            this.cell.entity = undefined;
        }
        this.setCell(cell);

        for (const xy of path) {
            const gxy = gridXYToWorldXY(xy, BattleGUI.getBattle().grid);
            const targetPosition = new Vector3(gxy.X, modelPrimaryPart.Position.Y, gxy.Z);
            if (modelPrimaryPart.Position === targetPosition) {
                continue;
            }

            print(`${modelPrimaryPart.Position} -> ${targetPosition}`);

            // Calculate the direction to face
            const direction = (targetPosition.sub(modelPrimaryPart.Position)).Unit;
            print(`Direction: ${direction}`);

            // Create a CFrame that points from the current position to the target position
            const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, modelPrimaryPart.Position.add(direction));
            print(`${modelPrimaryPart.Position} - look at -> ${modelPrimaryPart.Position.add(direction)}`);

            // Combine the position and orientation
            const targetCFrame = new CFrame(targetPosition).mul(lookAtCFrame.sub(modelPrimaryPart.Position));

            // Tween to the new CFrame
            const tween = TweenService.Create(
                modelPrimaryPart,
                new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { CFrame: targetCFrame }
            );

            tween.Play();
            await tween.Completed.Wait(); // Wait for the tween to complete before moving to the next point
        }
    }
}
