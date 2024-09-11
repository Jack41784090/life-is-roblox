import { ReplicatedStorage, TweenService } from "@rbxts/services";
import { extractMapValues, gridXYToWorldXY } from "shared/func";
import { BotType, EntityInitRequirements, EntityStats, EntityStatus, iAbility, iEntity, ReadinessIcon } from "shared/types/battle-types";
import Ability from "./Ability";
import Battle from "./Battle";
import BattleGUI from "./BattleGui";
import Cell from "./Cell";
import Expression from "./Expression";

// Handles animations for an entity
class AnimationHandler {
    animator?: Animator;
    idleBlinkingThread?: thread;
    facingClosestEntityThread?: thread;

    idleAnimationTrack?: AnimationTrack;
    idleAnimation?: Animation;
    blinkAnimationTrack?: AnimationTrack;
    blinkAnimation?: Animation;

    animationMap: Map<string, Animation> = new Map();

    expression: Expression | undefined;

    constructor(private entity: Entity) {
        print("Initialising animation handler");
        const model = entity.model;
        if (!model) {
            warn("Model not found");
            return;
        }

        this.animator = model.WaitForChild("Humanoid").WaitForChild("Animator") as Animator;

        // load animations
        const animationFolder = model.WaitForChild("anim") as Folder;
        const allAnimations = animationFolder.GetChildren() as Animation[];
        allAnimations.forEach((animation) => {
            this.animationMap.set(animation.Name, animation);
        });
        this.idleAnimation = this.animationMap.get("idle");
        this.blinkAnimation = this.animationMap.get("blink");
        if (this.idleAnimation) {
            this.idleAnimationTrack = this.animator.LoadAnimation(this.idleAnimation);
        }
        else {
            warn("Idle animation not found");
        }
        if (this.blinkAnimation) {
            this.blinkAnimationTrack = this.animator.LoadAnimation(this.blinkAnimation);
        }
        else {
            warn("Blink animation not found");
        }

        // expression
        this.initialiseExpression();

        // begin with idle animation
        this.playIdleAnimation();
    }

    initialiseExpression() {
        this.expression = new Expression(this.entity);
        this.idleBlinkingThread = task.spawn(() => {
            while (true) {
                wait(math.random(5, 10));
                this.expression?.blink();
            }
        })
    }

    playAnimation({ animation, priority = Enum.AnimationPriority.Action }: { animation: string; priority?: Enum.AnimationPriority; }) {
        const animationObj = this.animationMap.get(animation);
        if (!animationObj) {
            warn(`Animation ${animation} not found`);
            return Promise.reject(void 0)
        }
        const track = this.animator?.LoadAnimation(animationObj);
        if (!this.animator || !track) {
            warn(`Animator not loaded for ${animation}`);
            return Promise.reject(void 0)
        }

        track.Priority = priority;
        track.Play();

        return new Promise<void>((resolve) => {
            track.Stopped.Wait()
            resolve();
        });
    }

    playIdleAnimation() {
        print("Playing idle animation");
        this.idleAnimationTrack?.Play();
    }

    playBlinkAnimation() {
        print("Playing blink animation");
        this.blinkAnimationTrack?.Play();
    }
}

// Manages audio files for the entity
class AudioHandler {
    private idleSelectAudio: Sound[] = [];

    constructor(private entity: Entity) {
        this.initAudio();
    }

    initAudio() {
        // init audios
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder;
        const entityAudio = audioFolder?.FindFirstChild("entity") as Folder;
        const thisEntityAudio = entityAudio?.FindFirstChild(this.entity.stats.id) as Folder;
        if (!audioFolder) {
            warn("Audio folder not found");
            return;
        }
        if (!entityAudio) {
            warn("Entity audio folder not found");
            return;
        }
        if (!thisEntityAudio) {
            warn(`audio for ${this.entity.stats.id} not found`);
            return;
        }

        const allAudios = thisEntityAudio.GetChildren();
        this.idleSelectAudio = allAudios.filter((audio) => audio.Name === "idle") as Sound[];
        if (this.idleSelectAudio.size() === 0) {
            warn("Idle select audio not found");
        }
    }

    playIdleAudio() {
        // Logic to play idle audio
        if (!this.idleSelectAudio || this.idleSelectAudio?.size() === 0) {
            warn("Idle select audio not found");
            return;
        }
        const index = math.random(0, this.idleSelectAudio.size() - 1);
        this.idleSelectAudio[index].Play();
    }

    play(entityStatus: EntityStatus) {
        switch (entityStatus) {
            case EntityStatus.Idle:
                this.playIdleAudio();
                break;
        }
    }
}

// Manages tweening for entity movement and rotations
class TweenManager {
    private tweenQueue: Tween[] = [];

    addTween(tween: Tween) {
        this.tweenQueue.push(tween);
        task.spawn(() => {
            tween.Play();
        });
    }

    async waitForCompletion(tween: Tween) {
        return tween.Completed.Wait();
    }

    createTween(modelPrimaryPart: BasePart, targetCFrame: CFrame, duration: number): Tween {
        return TweenService.Create(
            modelPrimaryPart,
            new TweenInfo(duration, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: targetCFrame }
        );
    }
}

export default class Entity implements iEntity {
    battle: Battle;

    animationHandler?: AnimationHandler;
    audioHandler?: AudioHandler;

    tweenQueue: Array<Tween> = [];
    tweenHandleThread?: thread;

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
    template: Readonly<Model>;
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
        this.template = ReplicatedStorage.WaitForChild('Models').FindFirstChild(`entity_${this.stats.id}`) as Model;
        if (!this.template) {
            throw `Entity template not found for entity_${this.stats.id}`;
        }

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

    playAnimation({ animation, priority = Enum.AnimationPriority.Action }: { animation: string; priority?: Enum.AnimationPriority; }) {
        if (!this.animationHandler) {
            warn("Animation handler not initialised");
            return Promise.reject(void 0)
        }
        return this.animationHandler.playAnimation({ animation, priority });
    }

    playAudio(entityStatus: EntityStatus) {
        if (!this.audioHandler) {
            warn("Audio handler not initialised");
            return;
        }
        this.audioHandler.play(entityStatus);
    }

    cloneAndPositionTemplate(): Model | undefined {
        const entity = this.template?.Clone();
        //#region defence
        if (!entity) {
            warn(`Entity template not found for entity_${this.stats.id}`);
            return;
        }
        //#endregion
        this.positionModel(entity);
        this.model = entity;
        return this.model;
    }

    initialiseCharacteristics(): Model | undefined {
        const entity = this.cloneAndPositionTemplate();
        //#region defence
        if (!this.cell) {
            warn("Coordinates not set");
            return;
        }
        if (!entity) return;
        //#endregion
        entity.Parent = this.cell.part;
        this.animationHandler = new AnimationHandler(this);
        this.audioHandler = new AudioHandler(this);
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

    private positionModel(entity: Model) {
        const primaryPart = entity.PrimaryPart;
        if (!primaryPart) {
            throw `PrimaryPart is not set for the model entity_${this.stats.id}`;
        }
        const position = this.cell!.part.Position.add(new Vector3(0, this.cell!.height * this.cell!.size, 0));
        entity.PivotTo(new CFrame(position));
    }

    getAbilities(): Array<iAbility> {
        const uniPhysAbilities = extractMapValues(Ability.UNIVERSAL_PHYS);
        return uniPhysAbilities;
    }


    setCell(cell: Cell): Cell | undefined {
        if (cell.isVacant() === false) {
            warn("Cell is occupied");
            return;
        }

        if (this.cell) {
            this.cell.entity = undefined;
        }
        this.cell = cell;
        cell.entity = this;
        return this.cell;
    }
    async moveToCell(cell: Cell, path?: Vector2[]): Promise<void> {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const primaryPart = humanoid?.RootPart;
        //#region defence
        if (!primaryPart || !humanoid) {
            warn("Model not materialised", primaryPart, humanoid);
            return;
        }
        if (!path) {
            path = [cell.xy];
        }
        //#endregion
        this.setCell(cell);

        for (const xy of path) {
            const gxy = gridXYToWorldXY(xy, BattleGUI.GetBattle().grid);
            const targetPosition = new Vector3(gxy.X, primaryPart.Position.Y, gxy.Z);
            if (primaryPart.Position === targetPosition) {
                continue;
            }

            const direction = (targetPosition.sub(primaryPart.Position)).Unit;
            const lookAtCFrame = CFrame.lookAt(primaryPart.Position, primaryPart.Position.add(direction));
            const targetCFrame = new CFrame(targetPosition).mul(lookAtCFrame.sub(primaryPart.Position));

            // Tween to the new CFrame
            const tween = TweenService.Create(
                primaryPart,
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

    heal(num: number) {
        this.hip += num;
    }
}
