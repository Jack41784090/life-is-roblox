import { ReplicatedStorage, RunService, TweenService } from "@rbxts/services";
import { extractMapValues, gridXYToWorldXY } from "shared/func";
import { BotType, EntityInitRequirements, EntityStats, EntityStatus, iAbility, iEntity, ReadinessIcon } from "shared/types/battle-types";
import Ability from "./Ability";
import { Battle } from "./Battle";
import BattleGUI from "./BattleGui";
import Cell from "./Cell";
import Expression from "./Expression";

export default class Entity implements iEntity {
    battle: Battle;

    // animations
    idleBlinkingScript?: RBXScriptConnection;
    facingClosestEntityThread?: thread;
    idleAnimationTrack?: AnimationTrack;
    idleAnimation?: Animation;
    blinkAnimationTrack?: AnimationTrack;
    blinkAnimation?: Animation;

    tweenQueue: Array<Tween> = [];
    tweenHandleThread?: thread;

    // audios
    idleSelectAudio?: Sound[];

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
        this.battle = options.battle;
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = options.sta ?? 0;
        this.hip = options.hip ?? 0;
        this.org = options.org ?? 0;
        this.pos = options.pos ?? 0;
        this.name = options.name ?? options.stats.id;
        this.botType = options.botType || BotType.Enemy;

        this.initAnimationsAndModel();
        this.initAudioFiles();
        this.initTweenHandleScript();
    }

    initTweenHandleScript() {
        const iter: () => void = () => {
            this.tweenQueue = this.tweenQueue.filter(tween => tween.PlaybackState === Enum.PlaybackState.Begin);
            const q = this.tweenQueue;
            if (q.size() === 0) {
                wait(0.1);
                return iter();
            }
            const t = q.shift();
            if (t) {
                t.Play();
                print("Playing tween", t.TweenInfo);
                t.Completed.Wait();
            }
            return iter();
        }
        this.tweenHandleThread = task.spawn(iter);
    }

    initAnimationsAndModel() {
        const id = this.stats.id;
        this.template = ReplicatedStorage.WaitForChild(`entity_${id}`) as Model;
        const animFolder = this.template.WaitForChild("anim") as Folder;
        this.idleAnimation = animFolder.WaitForChild("idle") as Animation;
        this.blinkAnimation = animFolder.WaitForChild("blink") as Animation;
    }

    initAudioFiles() {
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

        const allAudios = thisEntityAudio.GetChildren();
        this.idleSelectAudio = allAudios.filter((audio) => audio.Name === "idle") as Sound[];
        if (this.idleSelectAudio.size() === 0) {
            warn("Idle select audio not found");
        }
    }

    playAudio(entityStatus: EntityStatus) {
        switch (entityStatus) {
            case EntityStatus.idle:
                const audio = this.idleSelectAudio?.[math.random(0, this.idleSelectAudio.size())];
                if (audio) {
                    audio.Play();
                }
                break;
        }
    }

    initialiseExpression() {
        this.expression = new Expression(this);
        this.idleBlinkingScript = RunService.RenderStepped.Connect(() => {
            this.expression?.blink();
            wait(math.random(1, 5));
        })
    }

    getAndCloneTemplate() {
        const entity = this.template?.Clone();
        if (!entity) {
            warn(`Entity template not found for entity_${this.stats.id}`);
            return;
        }
        this.positionModel(entity);
        this.model = entity;
        return entity;
    }

    initialiseCharacteristics() {
        if (!this.cell) {
            warn("Coordinates not set");
            return;
        }
        const entity = this.getAndCloneTemplate();
        if (!entity) return;

        entity.Parent = this.cell.part;
        this.initializeAnimation(entity);
        this.initialiseExpression();
        return this.model;
    }

    private faceClosestEntity() {
        const entities = this.battle.getAllEntities().filter(e => e !== this);
        if (entities.size() === 0) {
            warn("No other entities found");
            return;
        }

        const myXY = this.cell?.xy;
        if (!myXY) {
            warn("Current entity coordinates not set");
            return;
        }

        const closestEntity = entities.reduce((closestEntity, c) => {
            const closestEntityXY = closestEntity.cell?.xy;
            const currentEntityXY = c.cell?.xy;

            if (!closestEntityXY || !currentEntityXY) {
                warn("Coordinates not set for entity");
                return closestEntity;
            }

            const closestDistance = closestEntityXY.sub(myXY).Magnitude;
            const currentDistance = currentEntityXY.sub(myXY).Magnitude;

            return currentDistance < closestDistance ? c : closestEntity;
        }, entities[0]);

        if (closestEntity) {
            this.faceEntity(closestEntity);
        } else {
            warn("No closest entity found");
        }
    }


    private initializeAnimation(entity: Model) {
        const humanoid = entity.WaitForChild("Humanoid") as Humanoid;
        const animator = humanoid?.WaitForChild("Animator") as Animator;
        if (!animator) {
            warn("Animator not found");
            return
        }
        if (!this.idleAnimation) {
            warn("Idle animation not found");
            return;
        }

        this.animator = animator;
        this.idleAnimationTrack = animator.LoadAnimation(this.idleAnimation);
        this.idleAnimationTrack.Looped = true;
        this.idleAnimationTrack.Play();
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

    getAbilities(): iAbility[] {
        const uniPhysAbilities = extractMapValues(Ability.UNIVERSAL_PHYS);
        return uniPhysAbilities;
    }


    setCell(cell: Cell) {
        if (cell.isVacant() === false) {
            warn("Cell is occupied");
            return;
        }

        if (this.cell) {
            this.cell.entity = undefined;
        }
        this.cell = cell;
        cell.entity = this;
    }
    async moveToCell(cell: Cell, path?: Vector2[]) {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const modelPrimaryPart = humanoid?.RootPart;
        if (!modelPrimaryPart || !humanoid) {
            warn("Model not materialised", modelPrimaryPart, humanoid);
            return;
        }

        this.setCell(cell);
        if (!path) {
            path = [cell.xy];
        }

        for (const xy of path) {
            const gxy = gridXYToWorldXY(xy, BattleGUI.GetBattle().grid);
            const targetPosition = new Vector3(gxy.X, modelPrimaryPart.Position.Y, gxy.Z);
            if (modelPrimaryPart.Position === targetPosition) {
                continue;
            }

            const direction = (targetPosition.sub(modelPrimaryPart.Position)).Unit;
            const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, modelPrimaryPart.Position.add(direction));
            const targetCFrame = new CFrame(targetPosition).mul(lookAtCFrame.sub(modelPrimaryPart.Position));

            // Tween to the new CFrame
            const tween = TweenService.Create(
                modelPrimaryPart,
                new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { CFrame: targetCFrame }
            );
            this.tweenQueue.push(tween);
            await tween.Completed.Wait(); // Wait for the tween to complete before moving to the next point
        }
    }

    async faceEntity(entity: Entity) {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const modelPrimaryPart = humanoid?.RootPart;
        if (!modelPrimaryPart || !humanoid) {
            warn("Model not materialised", modelPrimaryPart, humanoid);
            return;
        }

        if (entity === this) {
            warn("Entity cannot face itself");
            return;
        }

        const targetPosition = entity.model?.PrimaryPart?.Position;
        if (!targetPosition) {
            warn("Target position not found", entity);
            return;
        }

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
        this.tweenQueue.push(tween);
        return tween.Completed.Wait();
    }
}
