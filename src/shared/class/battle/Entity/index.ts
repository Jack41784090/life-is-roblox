import { ReplicatedStorage, TweenService } from "@rbxts/services";
import { AbilitySet, BotType, EntityInitRequirements, EntityStats, EntityStatus, iAbility, iEntity, ReadinessIcon, Reality } from "shared/types/battle-types";
import { calculateRealityValue, extractMapValues } from "shared/utils";
import Ability from "../Ability";
import HexCell from "../Hex/Cell";
import AnimationHandler, { AnimationOptions } from "./AnimationHandler";
import AudioHandler from "./AudioHandler";
import Expression from "./Expression";
import TweenManager from "./TweenManager";

print(calculateRealityValue)

export default class Entity implements iEntity {

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

    async moveToCell(cell: HexCell, path?: HexCell[]): Promise<void> {
        const humanoid = this.model?.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        const primaryPart = humanoid?.RootPart;
        //#region
        if (!primaryPart || !humanoid) {
            warn("Model not materialised", primaryPart, humanoid);
            return;
        }
        if (!path) {
            path = [cell];
        }
        //#endregion

        const moveTrack = this.playAnimation({ animation: 'move', priority: Enum.AnimationPriority.Action, loop: true });
        for (const cell of path) {
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
            warn(this.name + " faceEntity: Entity features not initialised");
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
    private faceClosestEntity(entities: Entity[]) {
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
        const maxHP = calculateRealityValue(Reality.HP, this);
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