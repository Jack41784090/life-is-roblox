import { ReplicatedStorage, RunService, TweenService } from "@rbxts/services";
import { AbilitySet, BotType, EntityInitRequirements, EntityStats, EntityStatus, iAbility, iEntity, ReadinessIcon, Reality } from "shared/types/battle-types";
import { extractMapValues } from "shared/utils";
import { Battle } from "../Battle";
import Ability from "./Ability";
import HexCell from "./hex/HexCell";

// Handles animations for an entity
interface AnimationOptions {
    animation: string;
    loop: boolean;
    priority?: Enum.AnimationPriority;
    hold?: number,
}
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

    playAnimation({ animation, priority = Enum.AnimationPriority.Action, hold = 0, loop }: AnimationOptions): AnimationTrack | undefined {
        const animationObj = this.animationMap.get(animation);
        if (!animationObj) {
            warn(`Animation ${animation} not found`);
            return
        }
        const track = this.animator?.LoadAnimation(animationObj);
        if (!this.animator || !track) {
            warn(`Animator not loaded for ${animation}`);
            return
        }

        track.Looped = loop;
        track.Priority = priority;
        track.Play();
        if (hold > 0) {
            task.spawn(() => {
                const holdAnimation = this.animationMap.get(`${animation}-idle`)
                if (!holdAnimation) {
                    warn(`Hold animation ${animation}-idle not found`);
                    return;
                }
                const holdTrack = this.animator?.LoadAnimation(holdAnimation);
                if (!holdTrack) {
                    warn(`Hold track not loaded for ${animation}-idle`);
                    return;
                }

                track.Stopped.Wait();

                holdTrack.Priority = Enum.AnimationPriority.Action4;
                holdTrack.Looped = true;
                holdTrack.Play();
                wait(hold);
                holdTrack.Stop();
            })
        }

        return track;
    }

    playIdleAnimation() {
        print("Playing idle animation");
        if (!this.idleAnimationTrack) {
            warn("Idle animation track not found");
            return;
        }
        this.playAnimation({ animation: "idle", loop: true, priority: Enum.AnimationPriority.Idle });
    }

    playBlinkAnimation() {
        print("Playing blink animation");
        this.blinkAnimationTrack?.Play();
    }
}
class AudioHandler {
    private idleSelectAudio: Sound[] = [];

    constructor(private entity: Entity) {
        this.initAudio();
    }

    initAudio() {
        // init audios
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder;
        const thisEntityAudio = audioFolder?.FindFirstChild(this.entity.stats.id) as Folder;
        if (!audioFolder) {
            warn("Audio folder not found");
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
class TweenManager {
    private tweenQueue: Tween[] = [];
    playing: boolean = false;
    handleScript: RBXScriptConnection;

    constructor() {
        this.handleScript = RunService.RenderStepped.Connect(() => {
            if (this.playing) return;
            this.tweenQueue = this.tweenQueue.filter(tween => tween.PlaybackState === Enum.PlaybackState.Begin);
            const q = this.tweenQueue;
            const t = q.shift();
            if (t) {
                this.playing = true;
                t.Play();
                print("Playing tween", t.TweenInfo);
                t.Completed.Wait();
                this.playing = false;
            }
        });
    }

    addTween(tween: Tween) {
        this.tweenQueue.push(tween);
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

class Expression {
    static readonly expressions: Record<string, string> = {
        'entity_adalbrecht_eye_left_neutral': 'rbxassetid://83323658516421',
        'entity_adalbrecht_eye_right_neutral': 'rbxassetid://86539013473127',
        'entity_adalbrecht_eye_left_blink': 'rbxassetid://94175562997842',
        'entity_adalbrecht_eye_right_blink': 'rbxassetid://81850963919333',
    }

    entity: Entity;
    eyes?: Part;
    leftEyeDecal?: Decal;
    rightEyeDecal?: Decal;
    closedLeftEyeTextID?: string
    closedRightEyeTextID?: string

    constructor(entity: Entity) {
        this.entity = entity;
        const model = entity.model;

        if (!model) {
            warn("No model found");
            return;
        }

        const head = model.FindFirstChild("Head") as Part;
        if (!head) {
            warn("No head found");
            return;
        }

        const eyes = head.FindFirstChild("eyes") as Part;
        this.eyes = eyes;
        if (!eyes) {
            warn("No eyes found");
            return;
        }

        this.leftEyeDecal = eyes.FindFirstChild("left eye") as Decal;
        this.rightEyeDecal = eyes.FindFirstChild("right eye") as Decal;
    }

    closeLeftEye() {
        const model = this.entity.model;
        if (this.leftEyeDecal) {
            this.closedLeftEyeTextID = this.closedLeftEyeTextID ?? Expression.expressions[`${model?.Name}_eye_left_blink`];
            if (this.closedLeftEyeTextID) {
                this.leftEyeDecal.Texture = this.closedLeftEyeTextID
            }
        }
    }

    closeRightEye() {
        const model = this.entity.model;
        if (this.rightEyeDecal) {
            this.closedRightEyeTextID = this.closedRightEyeTextID ?? Expression.expressions[`${model?.Name}_eye_right_blink`];
            if (this.closedRightEyeTextID) {
                this.rightEyeDecal.Texture = this.closedRightEyeTextID
            }
        }
    }

    openLeftEye() {
        const model = this.entity.model;
        if (this.leftEyeDecal) {
            this.leftEyeDecal.Texture = Expression.expressions[`${model?.Name}_eye_left_neutral`]
        }
    }

    openRightEye() {
        const model = this.entity.model;
        if (this.rightEyeDecal) {
            this.rightEyeDecal.Texture = Expression.expressions[`${model?.Name}_eye_right_neutral`]
        }
    }

    blink() {
        const animationHandler = this.entity.animationHandler;
        const animator = animationHandler?.animator;
        const blinkAnimation = animationHandler?.blinkAnimation;
        const newBlinkTrack = blinkAnimation ? animator?.LoadAnimation(blinkAnimation) : undefined;

        if (!animationHandler) {
            warn("No animation handler found");
            return;
        }
        if (!blinkAnimation || !newBlinkTrack) {
            warn("No blink animation found");
            return;
        }
        if (!animator) {
            warn("No animator found");
            return;
        }

        newBlinkTrack.Looped = false;
        animationHandler.blinkAnimationTrack = newBlinkTrack;
        animationHandler.blinkAnimationTrack.Play();

        // tween
        if (this.eyes) {
            // const closeEyeFrame = track.GetTimeOfKeyframe("CloseEye");
            // const time = closeEyeFrame / 60;
            // const tween = TweenService.Create(
            //     this.eyes,
            //     new TweenInfo(time, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            //     {
            //         Size:
            //             new Vector3(
            //                 this.eyes.Size.X,
            //                 this.eyes.Size.Y * .65,
            //                 this.eyes.Size.Z
            //             )
            //     });
            // tween.Play();
        }

        // blink
        const openEye = newBlinkTrack.GetMarkerReachedSignal("OpenEye").Connect(() => {
            this.openLeftEye();
            this.openRightEye();
            if (this.eyes) {
                this.eyes.Size = new Vector3(
                    this.eyes.Size.X,
                    1,
                    this.eyes.Size.Z
                )
            }
        })
        const closeEye = newBlinkTrack.GetMarkerReachedSignal("CloseEye").Connect(() => {
            this.closeLeftEye();
            this.closeRightEye();
        })
        const close = newBlinkTrack.Stopped.Connect(() => {
            openEye.Disconnect();
            closeEye.Disconnect();
            close.Disconnect();
        })
    }
}
export default class Entity implements iEntity {
    private battle: Battle.System;

    animationHandler?: AnimationHandler;
    audioHandler: AudioHandler;
    tweenHandler: TweenManager;

    playerID: number;
    iconURL?: ReadinessIcon;
    cell: HexCell | undefined;

    readonly stats: Readonly<EntityStats>;
    team?: string;
    name: string;

    sta: number;
    hip: number;
    org: number;
    pos: number;

    armed: keyof typeof Enum.KeyCode | undefined;
    botType: BotType = BotType.Enemy;

    expression?: Expression;
    template: Readonly<Model>;
    model?: Model;
    hpPool?: SurfaceGui;
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
        this.template = ReplicatedStorage.WaitForChild('Models').FindFirstChild(this.stats.id) as Model;
        if (!this.template) {
            throw `Entity template not found for entity_${this.stats.id}`;
        }

        this.tweenHandler = new TweenManager();
        this.audioHandler = new AudioHandler(this);
    }

    //#region play animation/audio
    playAnimation({ animation, priority = Enum.AnimationPriority.Action, hold = 0, loop }: AnimationOptions): AnimationTrack | undefined {
        if (!this.animationHandler) {
            warn("Animation handler / model not initialised");
            return;
        }
        print(`${this.name}: Playing animation ${animation}`);
        return this.animationHandler.playAnimation({ animation, priority, hold, loop });
    }

    playAudio(entityStatus: EntityStatus) {
        if (!this.audioHandler) {
            warn("Audio handler not initialised");
            return;
        }
        this.audioHandler.play(entityStatus);
    }
    //#endregion

    //#region feature initialisation
    cloneAndPositionTemplate(): Model | undefined {
        const entity = this.template?.Clone();
        //#region
        if (!entity) {
            warn(`Entity template not found for entity_${this.stats.id}`);
            return;
        }
        //#endregion
        this.positionModel(entity);
        this.model = entity;
        return this.model;
    }

    initialiseModel(): Model | undefined {
        const entity = this.cloneAndPositionTemplate();
        if (!entity) return;
        entity.Parent = this.cell?.part;
        return this.model;
    }

    initialiseAnimations() {
        this.animationHandler = new AnimationHandler(this);
    }

    initialiseHPPool() {
        this.hpPool = this.model?.FindFirstChild("HPPool") as SurfaceGui;
        if (!this.hpPool) {
            warn("HP Pool not found");
            return;
        }
        this.hpPool.Adornee = this.cell?.part;

        const poolFrame = this.hpPool.WaitForChild("Pool") as Frame;
        if (!poolFrame) {
            warn("HP Pool frame not found");
            return;
        }
        poolFrame.Size = UDim2.fromScale(0, 0);
    }

    initialiseCharacteristics(): Model | undefined {
        this.initialiseModel();
        this.initialiseAnimations();
        this.initialiseHPPool();
        return this.model;
    }

    private positionModel(model: Model) {
        const primaryPart = model.PrimaryPart;
        //#region
        if (!primaryPart) {
            throw `PrimaryPart is not set for the model entity_${this.stats.id}`;
        }
        if (!this.cell) {
            warn(`${this.name}: positionModel: cell not defined.`)
            return;
        }
        //#endregion
        const origin = model.WaitForChild("origin") as Part;
        const targetPosition = this.cell.part.Position;
        primaryPart.Position = new Vector3(targetPosition.X, primaryPart.Position.Y, targetPosition.Z);
        origin.Position = new Vector3(origin.Position.X, targetPosition.Y, origin.Position.Z);
    }
    //#endregion

    //#region get abilities
    getAllAbilitySets(): Array<AbilitySet> {
        const allAbilities = this.getAllAbilities();
        const setOne: AbilitySet = {
            'Q': allAbilities[0],
            'W': allAbilities[0],
            'E': allAbilities[0],
            'R': allAbilities[0],
        };
        return [setOne];
    }

    getAllAbilities(): Array<iAbility> {
        const uniPhysAbilities = extractMapValues(Ability.UNIVERSAL_PHYS);
        return uniPhysAbilities;
    }

    getEquippedAbilitySet() {
        const sets = this.getAllAbilitySets();
        return sets[0];
    }
    //#endregion

    //#region cell move
    setCell(cell: HexCell): HexCell | undefined {
        if (cell.isVacant() === false) {
            warn("HexCell is occupied");
            return;
        }

        if (this.cell) {
            this.cell.entity = undefined;
        }
        this.cell = cell;
        cell.entity = this;
        return this.cell;
    }
    async moveToPosition(targetPosition: Vector3) {
        const modelPrimaryPart = this.model?.PrimaryPart;

        //#region
        if (!modelPrimaryPart) {
            warn("Model not materialised", modelPrimaryPart);
            return;
        }
        //#endregion

        const primaryPart = modelPrimaryPart;

        if (primaryPart.Position === targetPosition) {
            warn("Already at target position", targetPosition);
            return;
        }

        // Use the current Y position of the entity to avoid sinking into the ground
        const adjustedTargetPosition = new Vector3(targetPosition.X, primaryPart.Position.Y, targetPosition.Z);
        print(`${this.name}: Moving to position`, adjustedTargetPosition);

        const direction = (adjustedTargetPosition.sub(primaryPart.Position)).Unit;
        const lookAtCFrame = CFrame.lookAt(primaryPart.Position, primaryPart.Position.add(direction));

        // Create target CFrame with correct position and facing direction
        const targetCFrame = new CFrame(adjustedTargetPosition).mul(lookAtCFrame.sub(primaryPart.Position));

        // print("Target CFrame", targetCFrame);
        // print("Current CFrame", primaryPart.CFrame);
        // print("LookAt CFrame", lookAtCFrame);
        // print("Direction", direction);

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

        this.tweenHandler.addTween(tween);
        return tween.Completed.Wait();
    }

    async moveToCell(cell: HexCell, path?: Vector2[]): Promise<void> {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const primaryPart = humanoid?.RootPart;
        //#region
        if (!primaryPart || !humanoid) {
            warn("Model not materialised", primaryPart, humanoid);
            return;
        }
        if (!path) {
            path = [cell.qr()];
        }
        //#endregion

        const moveTrack = this.playAnimation({ animation: 'move', priority: Enum.AnimationPriority.Action, loop: true });
        for (const cell of path.mapFiltered(xy => this.battle.grid.getCell(xy.X, xy.Y))) {
            const targetPosition = cell.worldPosition();
            if (primaryPart.Position === targetPosition) continue;
            await this.moveToPosition(targetPosition);
            if (this.hpPool) this.hpPool.Adornee = cell.part;
        }
        moveTrack?.Stop();
        const transitionTrack = this.playAnimation({ animation: 'move->idle', priority: Enum.AnimationPriority.Action, loop: false });
        if (!transitionTrack) return;

        this.setCell(cell);

        return new Promise((resolve) => {
            const scrp = transitionTrack?.Ended.Connect(() => {
                scrp?.Disconnect();
                resolve();
            });
        });
    }
    //#endregion

    //#region look at ...
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
        this.tweenHandler.addTween(tween);
        return tween.Completed.Wait();
    }
    private faceClosestEntity() {
        const entities = this.battle.getAllEntities().filter(e => e !== this);
        if (entities.size() === 0) {
            warn("No other entities found");
            return;
        }

        const myXY = this.cell?.qrs;
        if (!myXY) {
            warn("Current entity coordinates not set");
            return;
        }

        const closestEntity = entities.reduce((closestEntity, c) => {
            const closestEntityXY = closestEntity.cell?.qrs;
            const currentEntityXY = c.cell?.qrs;

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
    //#endregion

    //#region hp pool
    changeHPPoolSize(size: UDim2) {
        const hpPoolFrame = this.hpPool?.WaitForChild("Pool") as Frame;
        if (hpPoolFrame) {
            this.tweenHandler.addTween(TweenService.Create(
                hpPoolFrame,
                new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { Size: size }
            ));
        }
    }

    //#endregion

    //#region number manipulation
    changeHP(num: number) {
        print(`${this.name}: Changing HP by ${num}`);

        this.hip += num;
        const maxHP = this.battle.calculateRealityValue(Reality.HP, this);
        const hpPercentage = 0.9 - math.clamp((this.hip / maxHP) * .9, 0, .9); print(hpPercentage)
        this.changeHPPoolSize(UDim2.fromScale(hpPercentage, hpPercentage));
    }
    heal(num: number) {
        if (num < 0) return;
        this.changeHP(num);
    }
    damage(num: number) {
        if (num < 0) return;
        this.changeHP(-num);
    }
    //#endregion
}
