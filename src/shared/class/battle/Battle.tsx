import Roact, { Portal } from "@rbxts/roact";
import { Players, ReplicatedStorage, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import AbilitySetElement from "gui_sharedfirst/components/battle/ability-set-gui";
import AbilitySlotsElement from "gui_sharedfirst/components/battle/ability-slots";
import OPTElement from "gui_sharedfirst/components/battle/otherPlayersTurnScreen";
import ButtonElement from "gui_sharedfirst/components/button";
import ButtonFrameElement from "gui_sharedfirst/components/button-frame";
import CellGlowSurfaceElement from "gui_sharedfirst/components/cell-glow-surface";
import CellSurfaceElement from "gui_sharedfirst/components/cell-surface";
import MenuFrameElement from "gui_sharedfirst/components/menu";
import ReadinessBarElement from "gui_sharedfirst/components/readiness-bar";
import { DECAL_OUTOFRANGE, DECAL_WITHINRANGE, MOVEMENT_COST } from "shared/const";
import { AbilitySet, AttackAction, BotType, CharacterActionMenuAction, CharacterMenuAction, ClashResult, ClashResultFate, EntityInitRequirements, EntityStats, EntityStatus, iAbility, iEntity, ReadinessIcon, Reality } from "shared/types/battle-types";
import { extractMapValues, getDummyStats, getPlayer, requestData } from "shared/utils";
import { bindableEventsMap, remoteEventsMap } from "shared/utils/events";
import Pathfinding from "./Pathfinding";
import Ability, { AbilityState } from "./system/Ability";
import HexCell from "./system/hex/HexCell";
import HexGrid from "./system/hex/HexGrid";

export namespace Battle {
    export type Config = {
        camera?: Camera,
        worldCenter: Vector3,
        width: number;
        height: number;
        teamMap: Record<string, Player[]>;
    };
    type MainUIModes = 'onlyReadinessBar' | 'withSensitiveCells';

    export const DEFAULT_WIDTH = 5;
    export const DEFAULT_HEIGHT = 5;
    export const DEFAULT_WORLD_CENTER = new Vector3(150, 0, 150);
    export const TILE_SIZE = 10;


    export const remoteEvent_Attack: RemoteEvent = remoteEventsMap["Battle_Attack"]
    export const remoteEvent_Start: RemoteEvent = remoteEventsMap["Battle_Start"]
    export const remoteEvent_MoveEntity: RemoteEvent = remoteEventsMap["Battle_MoveEntity"]

    export function calculateRealityValue(reality: Reality, entity: Entity): number {
        switch (reality) {
            case Reality.HP:
                return (entity.stats.end * 5) + (entity.stats.siz * 2);
            case Reality.Force:
                return (entity.stats.str * 2) + (entity.stats.spd * 1) + (entity.stats.siz * 1);
            case Reality.Mana:
                return (entity.stats.int * 3) + (entity.stats.spr * 2) + (entity.stats.fai * 1);
            case Reality.Spirituality:
                return (entity.stats.spr * 2) + (entity.stats.fai * 2) + (entity.stats.wil * 1);
            case Reality.Divinity:
                return (entity.stats.fai * 3) + (entity.stats.wil * 2) + (entity.stats.cha * 1);
            case Reality.Precision:
                return (entity.stats.dex * 2) + (entity.stats.acr * 1) + (entity.stats.spd * 1);
            case Reality.Maneuver:
                return (entity.stats.acr * 2) + (entity.stats.spd * 2) + (entity.stats.dex * 1);
            case Reality.Convince:
                return (entity.stats.cha * 2) + (entity.stats.beu * 1) + (entity.stats.int * 1);
            case Reality.Bravery:
                return (entity.stats.wil * 2) + (entity.stats.end * 1) + (entity.stats.fai * 1);
            default:
                warn(`Reality value for ${reality} not found`);
                return 0;
        }
    }

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
            print(this.blinkAnimation)

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
                warn(`${this.entity.name}: No animation handler found`);
                return;
            }
            if (!blinkAnimation || !newBlinkTrack) {
                warn(`${this.entity.name}: No blink animation found`, blinkAnimation, newBlinkTrack);
                return;
            }
            if (!animator) {
                warn(`${this.entity.name}: No animator found`);
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
    export class Entity implements iEntity {
        private battle: Battle.State;

        animationHandler?: AnimationHandler;
        audioHandler?: AudioHandler;
        tweenHandler?: TweenManager;

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
                throw `Entity template not found for "${this.stats.id}"`;
            }

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
        public isFeatureInitialised(): boolean {
            return this.model !== undefined &&
                this.animationHandler !== undefined &&
                this.audioHandler !== undefined &&
                this.tweenHandler !== undefined &&
                this.hpPool !== undefined;
        }

        private initialiseModel(): Model | undefined {
            const entity = this.template?.Clone();
            //#region
            if (!entity) {
                warn(`Entity template not found for entity_${this.stats.id}`);
                return;
            }
            //#endregion
            this.positionModel(entity);
            this.model = entity;
            this.model.Parent = this.cell?.part;
            return this.model;
        }

        private initialiseHPPool() {
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

        public initialiseCharacteristics(): Model | undefined {
            this.initialiseModel();
            this.tweenHandler = new TweenManager();
            this.audioHandler = new AudioHandler(this);
            this.animationHandler = new AnimationHandler(this);
            this.initialiseHPPool();
            return this.model;
        }

        private positionModel(model: Model) {
            const primaryPart = model.PrimaryPart;
            //#region
            if (!primaryPart) {
                throw `PrimaryPart is not set for the model entity_${this.stats.id}`;
            }
            if (!this.cell || !this.cell.part) {
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

            print(`${this.name}: Setting cell to ${cell.qrs}`);
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
            if (!this.isFeatureInitialised()) {
                warn(this.name + " moveToPosition: Entity features not initialised");
                return;
            }
            if (!modelPrimaryPart) {
                warn("Model not materialised", modelPrimaryPart);
                return;
            }
            if (modelPrimaryPart.Position === targetPosition) {
                warn("Already at target position", targetPosition);
                return;
            }
            //#endregion

            // Use the current Y position of the entity to avoid sinking into the ground
            const adjustedTargetPosition = new Vector3(targetPosition.X, modelPrimaryPart.Position.Y, targetPosition.Z);
            print(`${this.name}: Moving to position`, adjustedTargetPosition);

            const direction = (adjustedTargetPosition.sub(modelPrimaryPart.Position)).Unit;
            const lookAtCFrame = CFrame.lookAt(modelPrimaryPart.Position, modelPrimaryPart.Position.add(direction));

            // Create target CFrame with correct position and facing direction
            const targetCFrame = new CFrame(adjustedTargetPosition).mul(lookAtCFrame.sub(modelPrimaryPart.Position));

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

            this.tweenHandler!.addTween(tween);
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
            const targetPosition = entity.model?.PrimaryPart?.Position;
            //#region 
            if (!this.isFeatureInitialised()) {
                warn(this.name +  " faceEntity: Entity features not initialised");
                return;
            }
            else if (entity === this) {
                warn("Entity cannot face itself");
                return;
            }
            else if (!modelPrimaryPart || !humanoid) {
                warn("Model not materialised", modelPrimaryPart, humanoid);
                return;
            }
            else if (!targetPosition) {
                warn("Target position not found", entity);
                return;
            }
            //#endregion

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
            this.tweenHandler!.addTween(tween);
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
            if (!this.isFeatureInitialised()) {
                warn(this.name + " changePoolSize: Entity features not initialised");
                return;
            }

            const hpPoolFrame = this.hpPool?.WaitForChild("Pool") as Frame;
            this.tweenHandler!.addTween(TweenService.Create(
                hpPoolFrame,
                new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                { Size: size }
            ));
        }

        //#endregion

        //#region number manipulation
        changeHP(num: number) {
            print(`${this.name}: Changing HP by ${num}`);

            this.hip += num;
            const maxHP = Battle.calculateRealityValue(Reality.HP, this);
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
    export class Session {
        public static New(config: Partial<Config>) {
            const participatingPlayers: Player[] = []
            if (config.teamMap) {
                for (const [team, players] of pairs(config.teamMap)) {
                    players.forEach((player) => participatingPlayers.push(player));
                }
            }

            const CONFIG = {
                camera: undefined,
                worldCenter: DEFAULT_WORLD_CENTER,
                width: DEFAULT_WIDTH,
                height: DEFAULT_HEIGHT,
                teamMap: {},
                ...config,
            }
            const serverState = new State(CONFIG.width, CONFIG.height, CONFIG.worldCenter, TILE_SIZE);
            const controller = new Session(participatingPlayers, serverState, CONFIG);
            for (const p of participatingPlayers) {
                remoteEvent_Start.FireClient(p, config);
            }

            controller.setUpAttackReceiver();
            controller.setUpMoveEntityReceiver();
            return controller;
        }

        config: Config;
        trueState: State;
        participatingPlayers: Player[];

        private constructor(players: Player[], battleState: State, config: Config) {
            this.participatingPlayers = players;
            this.trueState = battleState
            this.config = config;
            this.trueState.initializeNumbers(config.teamMap);
        }

        //#region Remote Event: Attack
        private setUpAttackReceiver() {
            remoteEvent_Attack.OnServerEvent.Connect((player, _ability) => {
                print(`Attack: ${player.Name} | Ability:`, _ability);
                const abilityState = _ability as AbilityState;
                if (!abilityState || (typeOf(abilityState['using']) !== 'number')) {
                    warn("Ability invalid on attack");
                    return;
                }

                const { using: _using, target: _target } = abilityState

                const allEntities = this.trueState.getAllEntities(); print(allEntities)
                const using = allEntities.find((e) => e.playerID === _using);
                const target = allEntities.find((e) => e.playerID === _target);
                if (!using || !target) {
                    warn("Using or target entity not found", using, target);
                    return;
                }

                const ability = new Ability({
                    ...abilityState,
                    using,
                    target,
                });
                const attackAction = { executed: false, ability };
                const clashResult = this.clash(attackAction);
                this.applyClash(attackAction, clashResult);

                const usingPlayer = getPlayer(using.playerID);
                const targetPlayer = getPlayer(target.playerID);
                if (usingPlayer) remoteEvent_Attack.FireClient(usingPlayer, { ...clashResult, abilityState });
                if (targetPlayer) remoteEvent_Attack.FireClient(targetPlayer, { ...clashResult, abilityState});
            });
        }

        private applyClash(attackAction: AttackAction, clashResult: ClashResult) {
            print(`Clash Result: ${clashResult.fate} | Damage: ${clashResult.damage}`);
            attackAction.ability.target.damage(clashResult.damage);
        }

        private clash(attackAction: AttackAction): ClashResult {
            const { using: attacker, target, acc } = attackAction.ability;
            print(`Attacker: ${attacker.name} | Target: ${target.name} | Accuracy: ${acc}`);

            let fate: ClashResultFate = "Miss";
            let damage = 0;

            const hitRoll = math.random(1, 100);
            const hitChance = acc - Battle.calculateRealityValue(Reality.Maneuver, target);
            const critChance = Battle.calculateRealityValue(Reality.Precision, attacker);

            const abilityDamage = attackAction.ability.calculateDamage();
            const minDamage = abilityDamage * 0.5;
            const maxDamage = abilityDamage;

            if (hitRoll <= hitChance) {
                if (hitRoll <= hitChance * 0.1 + critChance) {
                    damage = math.random((minDamage + maxDamage) / 2, maxDamage) * 2;
                    fate = "CRIT";
                } else {
                    damage = math.random(minDamage, maxDamage);
                    fate = "Hit";
                }
            }

            damage = math.clamp(damage, 0, 1000);
            return { damage, u_damage: damage, fate, roll: hitRoll };
        }
        //#endregion

        //#region Remote Event: Move Entity
        setUpMoveEntityReceiver() {
            remoteEvent_MoveEntity.OnServerEvent.Connect((player, _toCell) => {
                print(`Move Entity: ${player.Name} to ${_toCell}`);
                const destinationQR = _toCell as Vector2;
                const entity = this.trueState.getAllEntities().find((e) => e.playerID === player.UserId);
                if (!entity) {
                    warn("Entity not found");
                    return;
                }
                this.moveEntity(entity, destinationQR);
            });
        }

        moveEntity(entity: Entity, dest: Vector2) {
            const toCell = this.trueState.grid.getCell(dest);
            if (!toCell) {
                warn("Destination cell not found");
                return;
            }
            this.trueState.moveEntity(entity, toCell);
        }
        //#endregion

        private updateEntityStatsAfterRound(entity: Entity) {
            print(`${entity.name} has ${entity.pos} readiness points`);
            entity.pos /= 2;
            print(`${entity.name} has ${entity.pos} readiness points`);
        }
    }

    export class State {
        currentRoundEntityID?: number;
        time: number = -1;
        teams: Team[] = [];

        grid: HexGrid;
        gridMin: Vector2;
        gridMax: Vector2;

        constructor(width: number, height: number, worldCenter: Vector3, size: number) {
            this.grid = new HexGrid({
                radius: math.floor(width / 2),
                center: new Vector2(worldCenter.X, worldCenter.Z),
                size,
                name: "BattleGrid",
            });
            const halfWidth = (width * size) / 2;
            const halfHeight = (height * size) / 2;
            this.gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
            this.gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);
        }

        //#region Debug Tools
        protected placeEntity(entity: Entity, cell: HexCell) {
            entity.setCell(cell);
        }
        //#endregion

        /**
         * Moves an entity to a specified cell along a calculated path.
         *
         * @param entity - The entity to be moved.
         * @param toCell - The destination cell to move the entity to.
         * @param path - An optional pre-calculated path for the entity to follow. If not provided, a path will be calculated.
         * @returns A promise that resolves when the entity has been moved.
         *
         * @remarks
         * - If the entity does not have a current cell, a warning is logged and the function returns early.
         * - The path is calculated using the entity's position and movement cost.
         * - If no path is found, a warning is logged and the function returns early.
         * - If the destination cell is not vacant, the function attempts to find an adjacent vacant cell.
         * - The GUI is updated to reflect the calculated path.
         */
        public async moveEntity(entity: Entity, toCell: HexCell, path?: Vector2[]): Promise<void> {
            //#region 
            if (!entity.cell) {
                warn("moveEntity: Entity has no cell");
                return;
            }
            //#endregion
            const lim = math.floor(entity.pos / MOVEMENT_COST);
            const calculatedPath =
                path ??
                new Pathfinding({
                    grid: this.grid,
                    start: entity.cell.qr(),
                    dest: toCell.qr(),
                    limit: lim,
                }).begin();
            //#region 
            if (calculatedPath.size() === 0) {
                warn(`Move Entity: No path found from ${entity.cell.qr().X}, ${entity.cell.qr().Y} to ${toCell.qr().X}, ${toCell.qr().Y}`,);
                return;
            }
            //#endregion
            let destination = toCell;
            if (!toCell.isVacant()) {
                const adjacentCell = this.grid.getCell(calculatedPath[calculatedPath.size() - 1]);
                if (adjacentCell?.isVacant()) {
                    destination = adjacentCell;
                } else {
                    warn("Move Entity: Destination cell and adjacent cell are not vacant");
                    return;
                }
            }

            // this.gui.mountOrUpdateGlow(calculatedPath.mapFiltered((v) => this.grid.getCell(v)));
            return entity.moveToCell(destination, calculatedPath);
        }
        /**
         * Initializes the teams for the battle.
         *
         * @param teamMap - A record where the key is the team name and the value is an array of players belonging to that team.
         *
         * This method iterates over the provided team map, processes each player to create an `Entity` object, and then
         * groups these entities into `Team` objects which are added to the `teams` array.
         *
         * Each player is mapped to an `Entity` object by fetching their character stats and other relevant information.
         * If the character stats are not found, a warning is logged and the player is skipped.
         *
         * @remarks
         * - The `playerID` is generated by adding a random number to the player's `UserId`.
         * - If the player's `UserId` is 0, the entity is marked as an enemy bot.
         * - The `characterID` is currently hardcoded as 'entity_adalbrecht' for temporary purposes.
         */
        private initializeTeams(teamMap: Record<string, Player[]>) {
            for (const [teamName, playerList] of pairs(teamMap)) {
                const members = playerList
                    .mapFiltered((player) => {
                        // const characterID = player.Character ? player.Character.Name : "default_character";
                        const characterID = 'entity_adalbrecht'; // temp
                        const characterStats = requestData(player, "characterStats", characterID) as EntityStats;
                        if (!characterStats) {
                            warn(`Character [${characterID}] not found for [${player.Name}]`);
                            return undefined;
                        }
                        return new Entity({
                            playerID: player.UserId,
                            stats: characterStats,
                            pos: 0,
                            org: 0,
                            hip: 0,
                            sta: 0,
                            name: player.Name,
                            team: teamName,
                            botType: player.UserId === -1 ? BotType.Enemy : undefined,
                            battle: this,
                        });
                    })
                    .filter((entity): entity is Entity => entity !== undefined);
                this.teams.push(new Team(teamName, members));
            }
        }

        private initializeEntitiesPositions() {
            const allEntities = this.getAllEntities();
            const vacantCells = this.grid.cells.filter((cell) => cell.isVacant());

            if (vacantCells.size() < allEntities.size()) {
                warn("Not enough vacant cells to spawn all entities", vacantCells.size(), allEntities.size());
                return;
            }

            for (const entity of allEntities) {
                if (entity.cell) continue;

                const i = math.random(0, vacantCells.size() - 1)
                const randomCell = vacantCells[i];
                if (randomCell) {
                    vacantCells.remove(i)
                    entity.setCell(randomCell);
                }
            }
        }

        public initializeNumbers(teamMap: Record<string, Player[]>) {
            this.grid.initialise();
            this.initializeTeams(teamMap);
            this.initializeEntitiesPositions();
            this.initializeTestingDummies(); // temp
        }

        private initializeTestingDummies() {
            const dummy = new Entity({
                stats: getDummyStats(),
                playerID: -1,
                battle: this,
                hip: 999,
                pos: 0,
                org: 999,
                sta: 999,
            })
            this.teams.push(new Team("Test", [dummy]));
            this.placeEntity(dummy, this.grid.cells.find((c) => c.isVacant())!);
        }

        public getAllEntities(): Entity[] {
            return this.teams.map((team) => team.members).reduce<Entity[]>((acc, val) => [...acc, ...val], []);
        }
    }

    export class Team {
        name: string;
        members: Entity[];

        constructor(name: string, members: Entity[]) {
            this.name = name;
            this.members = members;
        }

        push(...members: Entity[]) {
            for (const member of members) {
                if (!this.members.some((m) => m.stats.id === member.stats.id)) {
                    this.members.push(member);
                }
            }
        }
    }

    export class System extends State {
        private bcamera: Bamera;
        private gui: Gui;

        attackRemoteEventReceived?: RBXScriptConnection;
        escapeScript?: RBXScriptConnection;

        // status: BattleStatus = BattleStatus.Inactive;
        currentRoundEntity?: Entity;

        protected override placeEntity(entity: Entity, cell: HexCell) {
            entity.setCell(cell);
            entity.initialiseCharacteristics();
        }

        //#region Initializations
        /**
         * Creates a new Battle instance with the provided configuration.
         * 
         * @param config - The configuration object for the battle.
         * @param config.camera - The camera to be used in the battle.
         * @param config.worldCenter - The center position of the world.
         * @param config.width - The width of the battle area.
         * @param config.height - The height of the battle area.
         * @param config.teamMap - A record mapping team names to arrays of players.
         * 
         * @returns A new instance of the Battle class.
         */
        public static Create(config: {
            camera: Camera,
            worldCenter: Vector3,
            width: number;
            height: number;
            teamMap: Record<string, Player[]>;
        }): System {
            const battle = new System(config.worldCenter, TILE_SIZE, config.width, config.height, config.camera);
            battle.initializeNumbers(config.teamMap);
            battle.initializeGraphics();
            battle.initialiseFirstRound();
            return battle;
        }
        /**
         * Creates an instance of the Battle class.
         * 
         * @private
         * @constructor
         * @param {Vector3} worldCenter - The center point of the world in 3D space.
         * @param {number} size - The size of each hexagon in the grid.
         * @param {number} width - The width of the grid in hexagons.
         * @param {number} height - The height of the grid in hexagons.
         * @param {Bamera} camera - The camera used for the battle view.
         */
        private constructor(worldCenter: Vector3, size: number, width: number, height: number, camera: Camera) {
            super(width, height, worldCenter, size);
            this.bcamera = new Bamera(camera, worldCenter, this);
            this.gui = Gui.Connect(this.getReadinessIcons(), this.grid);
        }
        /**
         * Initializes the grid by calling the materialise method on the grid object.
         * This method sets up the grid for further operations.
         */
        private initializeGrid() {
            this.grid.materialise();
        }
        /**
         * Initializes the camera by setting it to HOI4 mode.
         * This method configures the camera to enter a specific mode
         * defined by the `enterHOI4Mode` method of the `bcamera` object.
         */
        private initializeCamera() {
            this.bcamera.enterHOI4Mode();
        }

        private initializeGraphics() {
            this.initializeCamera();
            this.initializeGrid();
        }

        public initialiseFirstRound() {
            if (this.time === -1) {
                this.initializeEntitiesCharacteristics();
                this.round();
            }
        }


        private initializeEntitiesCharacteristics() {
            const allEntities = this.getAllEntities();
            allEntities.forEach((e) => e.initialiseCharacteristics());
        }
        //#endregion

        //#region Entity Management

        public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
            return [
                {
                    type: CharacterActionMenuAction.Move,
                    run: (tree: Roact.Tree) => {
                        Roact.unmount(tree);
                        this.bcamera.enterHOI4Mode(entity.cell?.worldPosition()).then(() => {
                            this.enterMovementMode();
                        });
                    },
                },
                {
                    type: CharacterActionMenuAction.EndTurn,
                    run: (tree: Roact.Tree) => {
                        Roact.unmount(tree);
                        this.endTurn?.(void 0);
                    },
                },
            ];
        }

        //#endregion

        //#region Battle Flow
        endTurn?: (value: unknown) => void

        private setUpAttackRemoteEventReceiver() {
            if (RunService.IsServer()) return;
            this.attackRemoteEventReceived?.Disconnect();
            this.attackRemoteEventReceived = remoteEvent_Attack.OnClientEvent.Connect((cr: ClashResult & {abilityState: AbilityState}) => {
                print("Attack clash result received", cr);

                const using = this.getAllEntities().find((e) => e.playerID === cr.abilityState.using);
                const target = this.getAllEntities().find((e) => e.playerID === cr.abilityState.target);

                if (!using || !target) {
                    warn("Using or target entity not found", using, target);
                    return;
                }
                const ability = new Ability({
                    ...cr.abilityState,
                    using,
                    target,
                })
                this.executeAttackSequence(ability);
            })
        }

        private async round() {
            const r = this.incrementTime();

            this.gui.clearAll()
            this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });
            this.currentRoundEntity = await this.runReadinessGauntlet();
            if (!this.currentRoundEntity) {
                warn("No entity found to start the next round");
                await this.bcamera.enterHOI4Mode();
                this.round();
                return;
            }

            await this.bcamera.enterCharacterCenterMode();

            await new Promise((resolve) => {
                const cre = this.currentRoundEntity
                //#region 
                if (!cre) {
                    warn("No current round entity found");
                    return;
                }
                //#endregion
                this.endTurn = () => {
                    resolve(void 0);
                    this.gui.clearAll();
                }

                this.setUpAttackRemoteEventReceiver();

                if (cre.playerID !== Players.LocalPlayer.UserId) {
                    // other player turn...
                    this.gui.mountOtherPlayersTurnGui();
                    if (cre.playerID === -1) {
                        wait(2);
                        this.endTurn(void 0);
                    }
                }
                else {
                    this.gui.mountActionMenu(this.getCharacterMenuActions(cre));
                }
                cre.playAudio(EntityStatus.Idle);
            });

            this.finalizeRound(this.currentRoundEntity);
            this.round();
        }

        private incrementTime() {
            print(`Round ${this.time + 1} has begun!`);
            return ++this.time;
        }
        /**
         * Set up a script that listens for the escape key (X) to cancel the current action
         * @returns the script connection
         */
        private setUpCancelCurrentActionScript(): RBXScriptConnection {
            this.escapeScript?.Disconnect();
            this.escapeScript = UserInputService.InputBegan.Connect((i, gpe) => {
                if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                    this.returnToSelections();
                }
            })
            return this.escapeScript;
        }
        /**
         * Return to the selection screen after movement or canceling an action
         *  1. exitMovementUI() is called to reset the UI
         *  2. The camera is centered on the current entity
         *  3. going back to the action selection screen
         */
        private async returnToSelections() {
            this.exitMovementMode()
            await this.bcamera.enterCharacterCenterMode()
            if (this.currentRoundEntity) {
                this.gui.mountActionMenu(this.getCharacterMenuActions(this.currentRoundEntity));
            }
        }

        private finalizeRound(nextEntity: Entity) {
            // this.updateEntityStatsAfterRound(nextEntity);
            this.currentRoundEntity = undefined;
        }
        //#endregion

        //#region Combat Mechanics

        private async executeAttackSequence(ability: Ability) {
            print(`Attack clicked: ${ability}`);
            //#region 
            if (!ability.target.cell?.qr()) {
                warn("Target cell not found");
                return;
            }
            //#endregion
            const attackAction: AttackAction = { executed: false, ability };
            this.exitMovementMode()
            await this.playAttackAnimation(attackAction);
            this.enterMovementMode();
        }
        /**
         * Enter movement mode
         * 
         * Movement mode: when cells glow along with the cursor to create a pathfinding effect.
         * 
         * Steps:
         * 
         * 1. Set up scripts:
         *    - Set up an escape script to cancel the current action.
         * 
         * 2. Rendering:
         *    - Re-render the UI to include sensitive cells.
         *    - Mount the ability slots for the current entity.
         */
        private enterMovementMode() {
            print("Entering movement mode");
            this.escapeScript = this.setUpCancelCurrentActionScript();
            const cre = this.currentRoundEntity;
            if (cre) {
                this.gui.mountAbilitySlots(cre);
                this.gui.updateMainUI('withSensitiveCells', {
                    cre: cre!,
                    grid: this.grid,
                    readinessIcons: this.getReadinessIcons(),
                });
            }
        }

        private exitMovementMode() {
            this.escapeScript?.Disconnect();
            this.gui.clearAll();
            this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });
        }

        private async playAttackAnimation(attackAction: AttackAction) {
            const { using: attacker, target, animation } = attackAction.ability;
            //#region 
            if (!attacker.model?.PrimaryPart || !target.model?.PrimaryPart) {
                warn("Primary Part not found for attacker or target");
                return;
            }
            //#endregion

            await target.faceEntity(attacker);

            const attackerAnimationTrack = attacker.playAnimation({
                animation,
                priority: Enum.AnimationPriority.Action4,
                loop: false,
            });
            const targetInitAnimationTrack = target.playAnimation({
                animation: "defend",
                priority: Enum.AnimationPriority.Action2,
                loop: false,
            });

            let targetAnimationTrack: AnimationTrack | undefined;

            const hitConnection = attackerAnimationTrack?.GetMarkerReachedSignal("Hit").Connect(() => {
                targetAnimationTrack = target.playAnimation({
                    animation: "defend-hit",
                    priority: Enum.AnimationPriority.Action3,
                    loop: false,
                });
            });

            const endConnection = attackerAnimationTrack?.Ended.Connect(() => {
                hitConnection?.Disconnect();
                endConnection?.Disconnect();

                const transition = target.playAnimation({
                    animation: "defend->idle",
                    priority: Enum.AnimationPriority.Action4,
                    loop: false,
                });

                target.animationHandler?.idleAnimationTrack?.Stop();
                targetInitAnimationTrack?.Stop();
                targetAnimationTrack?.Stop();
                transition?.Stopped.Wait();
            });

            if (targetInitAnimationTrack?.IsPlaying) await targetInitAnimationTrack?.Ended.Wait();
            if (attackerAnimationTrack?.IsPlaying) await attackerAnimationTrack?.Ended.Wait();
            if (targetAnimationTrack?.IsPlaying) await targetAnimationTrack?.Ended.Wait();

            attacker.playAudio(EntityStatus.Idle);
        }
        //#endregion

        //#region Readiness Mechanics

        private getReadinessIcons(): ReadinessIcon[] {
            return this.getAllEntities().map((entity) => ({
                iconID: entity.playerID,
                iconUrl: "rbxassetid://18915919565",
                readiness: entity.pos / 100,
            }));
        }

        private calculateReadinessIncrement(entity: Entity) {
            return entity.stats.spd + math.random(-0.1, 0.1) * entity.stats.spd;
        }

        private runReadinessGauntlet() {
            const entities = this.getAllEntities();
            if (entities.size() === 0) return;

            while (!entities.some((e) => e.pos >= 100)) {
                this.iterateReadinessGauntlet(entities);
            }

            const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
            return this.gui.tweenToUpdateReadiness(this.getReadinessIcons()).then(() => winner);
        }

        private iterateReadinessGauntlet(entities: Entity[]) {
            for (const entity of entities) {
                entity.pos += this.calculateReadinessIncrement(entity);
                if (entity.pos >= 100) {
                    entity.pos = 100;
                }
            }
        }
        //#endregion
    }

    export class Gui {
        private mainGui: Roact.Tree;
        actionsGui: Roact.Tree | undefined;
        glowPathGui: Roact.Tree | undefined;
        abilitySlotGui: Roact.Tree | undefined;
        otherPlayersTurnGui: Roact.Tree | undefined;

        // Singleton pattern to connect the BattleGUI with the Battle instance
        static Connect(icons: ReadinessIcon[], grid: HexGrid) {
            const ui = new Gui(icons, grid);
            // remoteEventsMap["GuiStart"].FireAllClients(icons); // temp, should use icons playerID
            return ui
        }

        // Private constructor to prevent direct instantiation
        private constructor(icons: ReadinessIcon[], grid: HexGrid) {
            this.mainGui = this.mountInitialUI(icons);
            const glowUpCellsEvent = bindableEventsMap["GlowUpCells"] as BindableEvent;
            if (glowUpCellsEvent) {
                glowUpCellsEvent.Event.Connect((vecs: Vector2[]) => {
                    const cells = vecs.mapFiltered((qr) => grid.getCell(qr));
                    this.mountOrUpdateGlow(cells);
                });
            }

            this.readinessIconMap = new Map(icons.map((icon) => {
                const ref = Roact.createRef<Frame>();
                return [icon.iconID, ref];
            }));
        }

        /**
         * Updating main UI with a specific mode
         *  * `onlyReadinessBar`: only the readiness bar is shown
         *  * `withSensitiveCells`: the readiness bar and the sensitive cells (surfacegui on cells)
         * 
         * @param mode 
         * @returns the updated Roact tree
         */
        updateMainUI(mode: 'withSensitiveCells', props: { readinessIcons: ReadinessIcon[], cre: Entity, grid: HexGrid }): Roact.Tree;
        updateMainUI(mode: 'onlyReadinessBar', props: { readinessIcons: ReadinessIcon[] }): Roact.Tree;
        updateMainUI(mode: MainUIModes, props: {
            readinessIcons?: ReadinessIcon[]
            cre?: Entity
            grid?: HexGrid
        } = {}) {
            print(`Updating main UI with mode: ${mode}`);
            switch (mode) {
                case 'onlyReadinessBar':
                    if (!props.readinessIcons) {
                        warn(`No readiness icons provided for mode: ${mode}`);
                        return;
                    }
                    return Roact.update(this.mainGui,
                        <MenuFrameElement transparency={1} Key={`BattleUI`}>
                            <ReadinessBarElement icons={props.readinessIcons} ref={this.readinessIconMap} />
                        </MenuFrameElement>);
                case 'withSensitiveCells':
                    if (!props.cre || !props.grid || !props.readinessIcons) {
                        warn(`No entity, grid or readiness icons provided for mode: ${mode}`);
                        return;
                    }
                    return Roact.update(this.mainGui,
                        <MenuFrameElement transparency={1} Key={`BattleUI`}>
                            <ReadinessBarElement icons={props.readinessIcons} ref={this.readinessIconMap} />
                            {this.createSensitiveCellElements(props.cre, props.grid)}
                        </MenuFrameElement>);
            }
        }

        //#region UI Mounting Methods
        /**
         * Mounts action menu
         * Action Menu: a menu that shows the available actions for the entity's turn (e.g. go into move mode, items, end turn)
         * 
         * @param actions 
         * @returns 
         */
        mountActionMenu(actions: CharacterMenuAction[]) {
            print("Mounting action menu");
            this.unmountAndClear('actionsGui');
            this.actionsGui = Roact.mount(
                <MenuFrameElement Key={"ActionMenu"} transparency={1}>
                    <ButtonFrameElement position={new UDim2(0.7, 0, 0.35, 0)} size={new UDim2(0.2, 0, 0.6, 0)}>
                        {actions.map((action, index) => (
                            <ButtonElement
                                Key={action.type}
                                position={index / actions.size()}
                                size={1 / actions.size()}
                                onclick={() => {
                                    if (this.actionsGui) action.run(this.actionsGui)
                                }}
                                text={action.type}
                                transparency={0.9}
                            />
                        ))}
                    </ButtonFrameElement>
                </MenuFrameElement>);
            return this.actionsGui;
        }
        /**
         * Mount the initial UI, which contains the MenuFrameElement and the ReadinessBarElement
         * @returns the mounted Tree
         */
        mountInitialUI(icons: ReadinessIcon[]): Roact.Tree {
            return Roact.mount(
                <MenuFrameElement Key={`BattleUI`} transparency={1}>
                    <ReadinessBarElement icons={icons} ref={this.readinessIconMap} />
                </MenuFrameElement>
            );
        }
        // Highlight the cells along a path
        mountOrUpdateGlow(cell: HexCell, range: NumberRange): HexCell[] | undefined
        mountOrUpdateGlow(path: HexCell[]): HexCell[] | undefined
        mountOrUpdateGlow(_cells: HexCell[] | HexCell, range?: NumberRange) {
            const cellsToGlow = _cells instanceof HexCell ? _cells.findCellsWithinRange(range!) : _cells;
            const elements = cellsToGlow.mapFiltered((cell) => <CellGlowSurfaceElement cell={cell} />);
            const playerGUI = getPlayer()?.FindFirstChild("PlayerGui");
            if (!playerGUI) return;

            if (playerGUI && this.glowPathGui) {
                Roact.update(this.glowPathGui,
                    <Portal target={playerGUI}>
                        <frame>{elements}</frame>
                    </Portal>
                );
            } else {
                this.glowPathGui = Roact.mount(
                    <Portal target={playerGUI}>
                        <frame>{elements}</frame>
                    </Portal>);
            }

            return cellsToGlow;
        }

        mountOtherPlayersTurnGui() {
            this.unmountAndClear('otherPlayersTurnGui');
            this.otherPlayersTurnGui = Roact.mount(<OPTElement />);
        }

        mountAbilitySlots(cre: Entity) {
            const mountingAbilitySet = cre.getAllAbilitySets().find(a => a !== undefined);
            //#region 
            if (!mountingAbilitySet) {
                warn("No ability set found for entity");
                return;
            }
            //#endregion
            this.unmountAndClear('abilitySlotGui');
            this.abilitySlotGui = Roact.mount(
                <AbilitySetElement>
                    <AbilitySlotsElement cre={cre} gui={this} abilitySet={mountingAbilitySet} />
                </AbilitySetElement>
            );
        }

        unmountAndClear(propertyName: keyof this): void {
            const property = this[propertyName];
            if (property !== undefined && typeOf(property) === 'table') {
                print(`Unmounting and clearing: ${propertyName as string}`);
                const [s, f] = pcall(() => {
                    Roact.unmount(property as Roact.Tree);
                    this[propertyName] = undefined as unknown as this[typeof propertyName];
                });
                if (!s) {
                    warn(`Failed to unmount: ${f}`);
                }
            }
        }
        //#endregion

        //#region HexCell Methods
        /**
         * Get cell elements that are sensitive to mouse hover
         * @returns 
         */
        private createSensitiveCellElements(cre: Entity, grid: HexGrid): Roact.Element | undefined {
            return <frame>
                {grid.cells.map((c) => (
                    <CellSurfaceElement
                        cell={c}
                        onEnter={() => this.handleCellEnter(cre, c)}
                        onclick={() => this.handleCellClick(cre, c)}
                    />
                ))}
            </frame>;
        }
        /**
         * Handles the event when an entity enters a new cell.
         *
         * @param cre - The entity that is entering the cell.
         * @param enteringCell - The cell that the entity is entering.
         *
         * This function performs the following actions:
         * 1. Changes the mouse icon based on whether the cell is vacant and within range.
         * 2. If the entity is armed and the cell is not vacant, it faces the entity in the cell and updates the mouse icon based on the ability range.
         * 3. If the cell is within range, it mounts or updates the glow effect.
         * 4. If the cell is out of range, it mounts or updates the glow effect with a different icon.
         * 5. If the cell is vacant, it performs pathfinding to the cell and mounts or updates the glow effect along the path.
         */
        private handleCellEnter(cre: Entity, enteringCell: HexCell) {
            const currentCell = cre.cell;
            if (!currentCell) return;

            // 0. Change mouse icon if the cell is not vacant
            const mouse = Players.LocalPlayer.GetMouse();
            if (cre.armed && !enteringCell.isVacant()) {
                cre.faceEntity(enteringCell.entity!);
                const ability = cre.getEquippedAbilitySet()[cre.armed];
                if (!ability) {
                    mouse.Icon = '';
                    return;
                }
                else if (enteringCell.isWithinRangeOf(currentCell, ability.range)) {
                    mouse.Icon = DECAL_WITHINRANGE;
                    return this.mountOrUpdateGlow(currentCell, ability.range);
                }
                else {
                    mouse.Icon = DECAL_OUTOFRANGE;
                    return this.mountOrUpdateGlow(currentCell, ability.range);
                }
            }
            else {
                mouse.Icon = ''
                const pf = new Pathfinding({
                    grid: enteringCell.grid,
                    start: currentCell.qr(),
                    dest: enteringCell.qr(),
                    limit: math.floor(cre.pos / MOVEMENT_COST),
                    hexagonal: true,
                })
                if (!pf) return;
                const path = pf.begin();
                return this.mountOrUpdateGlow(path.mapFiltered((qr) => enteringCell.grid.getCell(qr)));
            }

            // 2. Move readiness icon to forecast post-move position
            // const readinessPercent = (cre.pos - (path.size() - 1) * MOVEMENT_COST) / MAX_READINESS;
            // this.updateSpecificReadinessIcon(cre.playerID, readinessPercent);

        }
        /**
         * Handles the click event on a cell within the battle GUI.
         *
         * @param cre - The entity that initiated the click event.
         * @param clickedCell - The cell that was clicked.
         */
        private handleCellClick(cre: Entity, clickedCell: HexCell) {
            if (clickedCell.isVacant()) {
                this.clickedOnEmptyCell(cre, clickedCell);
            }
            else {
                const entityClicked = clickedCell.entity!;
                this.clickedOnEntity(cre, entityClicked);
            }
        }
        /**
         * Handles the event when an entity is clicked.
         * 
         * @param cre - The current entity that is performing the click action.
         * @param entity - The target entity that is being clicked on.
         * 
         * This method checks if the current entity (`cre`) is armed and has an ability equipped.
         * If the ability is found and both entities have valid cells, it checks if the target entity
         * is within the range of the ability. If all conditions are met, it creates a new `Ability`
         * instance and fires the `onAttackClickedSignal` with the created ability.
         * 
         * Warnings are logged if:
         * - The current entity has no ability keyed.
         * - The target entity has no cell.
         * - The current entity has no cell.
         */
        private clickedOnEntity(cre: Entity, entity: Entity) {
            if (cre.armed) {
                const keyed = cre.armed;
                const iability = cre.getEquippedAbilitySet()[keyed];
                //#region
                if (!iability) {
                    warn(`clickedOnEntity: ${keyed} has no ability keyed`)
                    return;
                }
                if (!entity.cell) {
                    warn("clickedOnEntity: Entity has no cell");
                    return;
                }
                if (!cre.cell) {
                    warn("clickedOnEntity: Current entity has no cell");
                    return;
                }
                //#endregion
                if (entity.cell.isWithinRangeOf(cre.cell, iability.range)) {
                    const ability = new Ability({
                        ...iability,
                        using: cre,
                        target: entity,
                    });
                    remoteEvent_Attack.FireServer(ability.getState());
                }
            }
        }

        private clickedOnEmptyCell(cre: Entity, cell: HexCell) {
            if (cre.cell) {
                const pf = new Pathfinding({
                    grid: cell.grid,
                    start: cre.cell.qr(),
                    dest: cell.qr(),
                    limit: math.floor(cre.pos / MOVEMENT_COST),
                    hexagonal: true,
                })
                const path = pf?.begin();
                return cre.moveToCell(cell, path)
            }
            else {
                return Promise.resolve();
            }
        }
        //#endregion

        //#region Readiness Bar Methods
        readinessIconMap: Map<number, Roact.Ref<Frame>>;

        private async updateSpecificReadinessIcon(iconID: number, readiness: number) {
            const iconFrame = this.readinessIconMap.get(iconID)?.getValue();
            if (!iconFrame) {
                warn("No icon found for readiness update", iconID);
                return;
            }

            const clampedReadiness = math.clamp(readiness, 0, 1);
            return new Promise((resolve) => {
                iconFrame.TweenPosition(
                    UDim2.fromScale(0, clampedReadiness),
                    Enum.EasingDirection.InOut,
                    Enum.EasingStyle.Linear,
                    math.abs(iconFrame.Position.Y.Scale - clampedReadiness),
                    true,
                    resolve
                );
            })
        }
        // Animate the readiness bar update
        public tweenToUpdateReadiness(newReadinessIcons: ReadinessIcon[]) {
            print("Tweening to update readiness");
            const promises: Promise<void>[] = [];

            for (const icon of newReadinessIcons) {
                const ref = this.readinessIconMap.get(icon.iconID);
                if (!ref) continue;
                const iconRef = ref.getValue();
                if (!iconRef) continue;

                const readiness = icon.readiness;
                const positionTween = TweenService.Create(
                    iconRef,
                    new TweenInfo(math.abs(iconRef.Position.Y.Scale - readiness), Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
                    { Position: UDim2.fromScale(0, readiness) }
                );

                promises.push(new Promise((resolve) => {
                    positionTween.Completed.Connect(() => resolve());
                    positionTween.Play();
                }));
            }

            return Promise.all(promises);
        }
        //#endregion

        //#region Clearing Methods

        public clearAll() {
            this.clearAllLooseGui();
            this.clearAllLooseScript();
        }

        public clearAllLooseGui() {
            if (this.abilitySlotGui) {
                this.unmountAndClear('abilitySlotGui');
            }
            if (this.otherPlayersTurnGui) {
                this.unmountAndClear('otherPlayersTurnGui');
            }
            if (this.actionsGui) {
                this.unmountAndClear('actionsGui');
            }
            if (this.glowPathGui) {
                this.unmountAndClear('glowPathGui');
            }
        }

        public clearAllLooseScript() {
        }
        //#endregion
    }

    export class Bamera {
        battle: System;

        // Camera-Related Information
        static HOI4_PAN_SPEED = 0.6;
        static CHAR_ANGLE = 0;

        worldCenter: Vector3;
        size: number;
        camera: Camera;
        mode: "HOI4" | "CHAR_CENTER" | "ANIMATION" = "HOI4";
        panningEnabled: boolean = true;
        panService: RBXScriptConnection | undefined;

        camAnimFolder: Folder;

        constructor(camera: Camera, worldCenter: Vector3, battle: System) {
            this.worldCenter = worldCenter;
            this.size = battle.grid.size;
            this.camera = camera;
            this.battle = battle;
            this.setupRenderStepped();

            this.camAnimFolder = ReplicatedStorage.WaitForChild("CamAnim") as Folder;
        }

        static readonly EDGE_BUFFER = 0.15;

        private setupRenderStepped() {
            // Manage a single RenderStepped connection for all camera panning
            this.panService = RunService.RenderStepped.Connect((deltaTime) => {
                if (this.panningEnabled) {
                    const gridDelta = this.detectEdgeMovement();
                    this.updateCameraPosition(gridDelta, deltaTime);
                }
            });
        }

        detectEdgeMovement(): Vector2 {
            const mousePosition = UserInputService.GetMouseLocation();
            const screenSize = this.camera.ViewportSize;

            let gridDelta = new Vector2(0, 0);

            const edgeBuffer_x = screenSize.X * Bamera.EDGE_BUFFER;
            if (mousePosition.X < edgeBuffer_x) {
                const percentage = 1 - math.clamp(mousePosition.X / edgeBuffer_x, 0, 1);
                gridDelta = gridDelta.add(new Vector2(-percentage, 0));
            } else if (mousePosition.X > screenSize.X - edgeBuffer_x) {
                const percentage = 1 - math.clamp((screenSize.X - mousePosition.X) / edgeBuffer_x, 0, 1);
                gridDelta = gridDelta.add(new Vector2(percentage, 0));
            }

            const edgeBuffer_y = screenSize.Y * Bamera.EDGE_BUFFER;
            if (mousePosition.Y < edgeBuffer_y) {
                const percentage = 1 - math.clamp(mousePosition.Y / edgeBuffer_y, 0, 1);
                gridDelta = gridDelta.add(new Vector2(0, percentage));
            } else if (mousePosition.Y > screenSize.Y - edgeBuffer_y) {
                const percentage = 1 - math.clamp((screenSize.Y - mousePosition.Y) / edgeBuffer_y, 0, 1);
                gridDelta = gridDelta.add(new Vector2(0, -percentage));
            }

            return gridDelta;

        }

        resetAngle(primPart: BasePart, camOriPart: BasePart) {
            const mX = primPart.Position.X;
            const mZ = primPart.Position.Z;
            const cX = camOriPart.Position.X;
            const cZ = camOriPart.Position.Z;
            const xDiff = cX - mX;
            const zDiff = cZ - mZ;
            const initAngle = math.atan2(zDiff, xDiff);
            Bamera.CHAR_ANGLE = initAngle;
        }

        async enterHOI4Mode(worldFocus?: Vector3) {
            print('Setting up HOI4 Camera Pan');
            this.panningEnabled = false;
            const center = worldFocus ?? this.worldCenter;
            const x1 = new Vector3(center.X, 25, center.Z);
            const x2 = new Vector3(center.X, 0, center.Z);
            const lookAtCframe = new CFrame(x1, x2);
            return this.setCameraCFrame(lookAtCframe).then(() => {
                this.mode = "HOI4";
                this.panningEnabled = true
            });
        }

        async enterCharacterCenterMode() {
            print('Setting up Character Center Camera Pan');
            this.panningEnabled = false;
            const model = this.battle.currentRoundEntity?.model;
            const primPart = model?.PrimaryPart;
            const camOriPart = model?.FindFirstChild("cam-ori") as BasePart;
            //#region
            if (!primPart || !camOriPart) {
                warn("Primary Part or Camera Orientation Part not found!", this.battle.currentRoundEntity, model, primPart, camOriPart);
                return;
            }
            //#endregion
            this.resetAngle(primPart, camOriPart);
            return model ?
                this.goToModelCam(model).then(() => {
                    this.mode = "CHAR_CENTER";
                    this.panningEnabled = true;
                }) :
                Promise.resolve();
        }

        private updateCameraPosition(gridDelta: Vector2, deltaTime: number) {
            // Determine which camera mode is active and update accordingly
            switch (this.mode) {
                case "HOI4":
                    this.updateHOI4CameraPosition(gridDelta);
                    break;
                case "CHAR_CENTER":
                    this.updateCharCenterCameraPosition(gridDelta, deltaTime);
                    break;
            }
        }

        private updateHOI4CameraPosition(gridDelta: Vector2) {
            const camera = this.camera ?? Workspace.CurrentCamera;
            if (!camera) {
                warn("Camera not found!");
                return;
            }

            const cameraCFrame = camera.CFrame;
            const cameraPosition = cameraCFrame.Position.add(new Vector3(gridDelta.Y * Bamera.HOI4_PAN_SPEED, 0, gridDelta.X * Bamera.HOI4_PAN_SPEED));

            // Ensure the camera stays within the grid bounds
            const clampedX = math.clamp(cameraPosition.X, this.battle.gridMin.Y, this.battle.gridMax.Y);
            const clampedZ = math.clamp(cameraPosition.Z, this.battle.gridMin.X, this.battle.gridMax.X);

            camera.CFrame = new CFrame(
                new Vector3(clampedX, cameraPosition.Y, clampedZ),
                cameraCFrame.LookVector.add(new Vector3(clampedX, 0, clampedZ))
            );
        }

        private updateCharCenterCameraPosition(gridDelta: Vector2, deltaTime: number) {
            // Assume model is available and valid (add proper checks in production code)
            const model = this.battle.currentRoundEntity?.model;
            if (model?.PrimaryPart === undefined) {
                warn("Model not found!");
                return;
            }

            const camOriPart = model.WaitForChild("cam-ori") as BasePart;
            const primaryPart = model.PrimaryPart;

            const mX = primaryPart.Position.X;
            const mZ = primaryPart.Position.Z;
            const mY = primaryPart.Position.Y;
            const cX = camOriPart.Position.X;
            const cZ = camOriPart.Position.Z;
            const cY = camOriPart.Position.Y;

            const xDiff = cX - mX;
            const yDiff = math.abs(mY - cY);
            const zDiff = cZ - mZ;
            const camera = this.camera ?? Workspace.CurrentCamera;
            if (!camera) {
                warn("Camera not found!");
                return;
            }

            const radius = math.sqrt((xDiff * xDiff) + (zDiff * zDiff));
            const rotationSpeed = math.rad(60 * math.sign(gridDelta.X) * (gridDelta.X ** 2) * deltaTime); // 30 degrees per second
            Bamera.CHAR_ANGLE += rotationSpeed;

            const offsetX = math.cos(Bamera.CHAR_ANGLE) * radius;
            const offsetZ = math.sin(Bamera.CHAR_ANGLE) * radius;

            const cameraPosition = model.PrimaryPart.Position.add(new Vector3(offsetX, yDiff, offsetZ));

            camera.CFrame = CFrame.lookAt(cameraPosition, model.PrimaryPart.Position);
        }

        private setCameraCFrame(cFrame: CFrame, tweenInfo?: TweenInfo) {
            const cam = this.camera;
            cam.CameraType = Enum.CameraType.Scriptable;
            const tween = TweenService.Create(
                cam,
                tweenInfo ?? new TweenInfo(0.3, Enum.EasingStyle.Quart, Enum.EasingDirection.InOut),
                { CFrame: cFrame }
            )
            return new Promise<void>((resolve) => {
                tween.Play();
                tween.Completed.Wait();
                resolve();
            });
        }

        private goToModelCam(model: Model) {
            const cam_ori = model.WaitForChild("cam-ori") as BasePart;
            return this.setCameraCFrame(cam_ori.CFrame);
        }

        async playAnimation({ animation, center, }: { animation: string; center?: CFrame }) {
            const a = this.camAnimFolder.FindFirstChild(animation) as Animation;
            const framesFolder = a?.FindFirstChild("Frames") as Folder;
            if (!a) {
                warn("Animation not found!");
                return;
            }
            if (!framesFolder) {
                warn("Frames folder not found!");
                return;
            }

            const oldCameraMode = this.mode;
            const oldCameraType = this.camera.CameraType;
            const oldCameraCFrame = this.camera.CFrame;
            let frameTime = 0;
            this.camera.CameraType = Enum.CameraType.Scriptable;
            this.mode = "ANIMATION";

            // tween to first frame
            const firstFrame = framesFolder.FindFirstChild("0") as CFrameValue;
            if (!firstFrame) {
                warn("First frame not found!");
                return
            }
            const tween = TweenService.Create(
                this.camera,
                new TweenInfo(0.1, Enum.EasingStyle.Quart, Enum.EasingDirection.InOut),
                { CFrame: center ? center.mul(firstFrame.Value) : firstFrame.Value }
            )
            tween.Play();
            tween.Completed.Wait();

            const playPromise = new Promise(resolve => {
                const con = RunService.RenderStepped.Connect((deltaTime) => {
                    frameTime += deltaTime * 60;
                    const frame = framesFolder.FindFirstChild(tostring(math.ceil(frameTime))) as CFrameValue;
                    if (frame) {
                        this.camera.CFrame = center ?
                            center.mul(frame.Value) :
                            frame.Value;
                    } else {
                        wait(0.5);
                        con.Disconnect();
                        resolve(void 0);
                    }
                });
            })


            return {
                playPromise,
                doneCallback: () => {
                    this.camera.CameraType = oldCameraType;
                    this.camera.CFrame = oldCameraCFrame;
                    this.mode = oldCameraMode;
                }
            };
        }
    }
}