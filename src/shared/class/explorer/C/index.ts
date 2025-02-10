import { Atom, atom } from "@rbxts/charm";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import AnimationHandler, { AnimationType } from "shared/class/battle/State/Entity/Graphics/AnimationHandler";
import Place from "../Place";
import { CConfig, CState } from "./types";

export default class C {
    //#region infrastructure
    protected associatedPlace: Place;
    protected id: string;
    protected model: Model = new Instance('Model');
    protected humanoid: Humanoid;
    protected animationHandler: AnimationHandler;
    protected connections: Array<() => void> = [];
    protected state: CState = CState.IDLE;
    protected prevState = CState.IDLE;
    //#endregion

    //#region walking
    protected hurrying: boolean = false;
    protected walkingDirection: Vector3 = new Vector3();
    protected walkSpeedFractionAtom: Atom<number>;
    protected walkSpeedTracker: RBXScriptConnection;
    protected maxWalkSpeed: number = 12;
    protected maxSprintSpeed: number = this.maxWalkSpeed * 1.5;
    protected maxAcc: number = 1;
    protected acc: Atom<number> = atom(0);
    protected accSpeed: number = 0.8;
    //#endregion

    constructor(config: CConfig, place: Place) {
        this.id = config.id;
        this.associatedPlace = place;
        this.spawn(config);

        const humanoid = this.model.WaitForChild('Humanoid') as Humanoid;
        assert(humanoid.IsA('Humanoid'), `Humanoid not found in model '${this.id}'`);
        const animator = humanoid.WaitForChild('Animator') as Animator;
        assert(animator.IsA('Animator'), `Animator not found in model '${this.id}'`);
        this.animationHandler = new AnimationHandler(humanoid, animator, this.model);
        this.humanoid = humanoid;
        this.walkSpeedFractionAtom = atom(humanoid.WalkSpeed / this.maxWalkSpeed);
        this.walkSpeedTracker = this.humanoid.GetPropertyChangedSignal('WalkSpeed').Connect(() => {
            this.walkSpeedFractionAtom(this.humanoid.WalkSpeed / this.maxWalkSpeed);
        });

        RunService.RenderStepped.Connect(dt => {
            this.stateChangeTracker();
            this.accelerationTracker(dt);
        });
    }

    private spawn(config: CConfig) {
        const template = ReplicatedStorage.WaitForChild('Models')
            .WaitForChild("NPCs")
            .WaitForChild(this.id) as Model;
        assert(template.IsA('Model'), `Model '${this.id}' not found`);
        this.model = template.Clone();
        this.model.Parent = this.associatedPlace.getModel();
        this.model.Name = config.displayName;
        this.model.PrimaryPart!.CFrame = new CFrame(config.spawnLocation);
    }

    protected stateChangeTracker() {
        const ah = this.animationHandler;
        if (this.state !== this.prevState) {
            this.prevState = this.state;
            print(`[State] ${this.state}`);
        }
        switch (this.state) {
            case CState.IDLE:
                ah.playAnimationIfNotPlaying(AnimationType.Idle, { animation: 'explore-idle', loop: true, priority: Enum.AnimationPriority.Idle });
                ah.killAnimationIfPlaying(AnimationType.Transition);
                ah.killAnimationIfPlaying(AnimationType.Move);
                break;
            case CState.START_WALK:
                const existingTransitionTrack = ah.getTrack(AnimationType.Transition);
                if (existingTransitionTrack !== undefined && existingTransitionTrack.IsPlaying === false) {
                    this.state = CState.ACCELERATE;
                    ah.killAnimation(AnimationType.Transition);
                }
                else {
                    ah.playAnimationIfNotPlaying(AnimationType.Transition, {
                        animation: this.hurrying ? 'explore-idle->sprint' : 'explore-idle->walk',
                        loop: false,
                        priority: Enum.AnimationPriority.Action,
                        weightAtom: this.walkSpeedFractionAtom,
                        weightMultiplier: 3,
                        update: true,
                    });
                }
                break;
            case CState.ACCELERATE:
            case CState.DECELERATE:
                ah.playAnimationIfNotPlaying(AnimationType.Move, {
                    animation: this.hurrying ? 'explore-sprint' : 'explore-walk',
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    priority: Enum.AnimationPriority.Movement,
                });
                break;
            case CState.FULL_WALK:
                ah.playAnimationIfNotPlaying(AnimationType.Move, {
                    animation: this.hurrying ? 'explore-sprint' : 'explore-walk',
                    loop: true,
                    priority: Enum.AnimationPriority.Movement,
                    update: true,
                });
                break;
            case CState.TALKING:
                break;
        }
    }

    protected stateUpdater() {
        const isMoving = this.walkingDirection.Magnitude > 0;
        const currentAcceleration = this.acc();
        const curSpd = this.humanoid.WalkSpeed;

        if (isMoving) {
            if (this.state === CState.IDLE) {
                this.state = CState.START_WALK;
            } else if (math.abs(currentAcceleration - this.maxAcc) < 0.01) {
                this.state = CState.FULL_WALK;
            } else if (currentAcceleration < this.maxAcc) {
                this.state = CState.ACCELERATE;
            }
        } else {
            if (curSpd > 0) {
                this.state = CState.DECELERATE;
            } else {
                this.state = CState.IDLE;
            }
        }
    }

    protected accelerationTracker(dt: number) {
        const currentSpeed = this.humanoid.WalkSpeed;
        const currentAcceleration = this.acc();
        const topSpeed = this.hurrying ? this.maxSprintSpeed : this.maxWalkSpeed;
        const intendOnMoving = this.walkingDirection.Magnitude > 0;

        const humanoid = this.humanoid;
        const accelerationSpeed = this.accSpeed * (this.hurrying ? 2 : 1);

        if (intendOnMoving) {
            if (math.abs(currentSpeed - topSpeed) < 0.01) return;
            if (currentAcceleration < this.maxAcc) {
                this.acc(math.min(currentAcceleration + dt * accelerationSpeed, this.maxAcc));
            } else if (currentAcceleration > this.maxAcc) {
                this.acc(currentAcceleration - (dt * 5 * math.random()));
            }
        } else {
            if (humanoid.WalkSpeed > 0) {
                this.acc(currentAcceleration - (dt * 5 * math.random()));
            } else {
                this.acc(0);
            }
        }
        humanoid.WalkSpeed = (this.hurrying ? this.maxSprintSpeed : this.maxWalkSpeed) * math.clamp(this.acc(), 0, this.maxAcc);

        // Sync state updates based on the latest acceleration and movement input.
        this.stateUpdater();
    }

    protected startMoving(vector: Vector3) {
        this.walkingDirection = vector;
        this.humanoid.Move(vector);
    }

    protected stopMoving() {
        this.walkingDirection = new Vector3();
    }

    public destroy() {
        this.model.Destroy();
        this.walkSpeedTracker.Disconnect();
        this.animationHandler?.destroy();
        this.connections.forEach(conn => conn());
    }

    public getModel() {
        return this.model;
    }
}