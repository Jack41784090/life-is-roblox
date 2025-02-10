import { Atom, atom } from "@rbxts/charm";
import { ReplicatedStorage, RunService } from "@rbxts/services";
import AnimationHandler, { AnimationType } from "shared/class/battle/State/Entity/Graphics/AnimationHandler";
import Place from "../Place";
import { CConfig, CState } from "./types";

export default class C {
    protected associatedPlace: Place;
    protected id: string;
    protected model: Model = new Instance('Model');
    protected humanoid: Humanoid;
    protected animationHandler: AnimationHandler;
    protected connections: Array<() => void> = [];
    protected state: CState = CState.IDLE;
    protected walkSpeedFractionAtom: Atom<number>;
    protected walkSpeedTracker: RBXScriptConnection;
    protected walkingDirection: Vector3 = new Vector3();
    protected maxWalkSpeed: number = 15;
    protected maxAcc: number = 1;
    protected acc: Atom<number> = atom(0);
    protected accSpeed: number = 0.8;
    protected prevState = CState.IDLE;

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
                ah.playAnimationIfNotPlaying(AnimationType.ExploreIdle, { animation: AnimationType.ExploreIdle, loop: true, priority: Enum.AnimationPriority.Idle });
                ah.killAnimationIfPlaying(AnimationType.Transition);
                ah.killAnimationIfPlaying(AnimationType.ExploreWalk);
                ah.killAnimationIfPlaying(AnimationType.ExploreSprint);
                break;
            case CState.START_WALK:
                const existingTransitionTrack = ah.getTrack(AnimationType.Transition);
                if (existingTransitionTrack !== undefined && existingTransitionTrack.IsPlaying === false) {
                    this.state = CState.ACCELERATE;
                    ah.killAnimation(AnimationType.Transition);
                } else {
                    ah.playAnimationIfNotPlaying(AnimationType.Transition, {
                        animation: 'explore-idle->walk',
                        loop: false,
                        priority: Enum.AnimationPriority.Action,
                        weightAtom: this.walkSpeedFractionAtom,
                        weightMultiplier: 3,
                    });
                }
                break;
            case CState.ACCELERATE:
            case CState.DECELERATE:
                ah.playAnimationIfNotPlaying(AnimationType.ExploreWalk, {
                    animation: AnimationType.ExploreWalk,
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    priority: Enum.AnimationPriority.Movement,
                });
                break;
            case CState.FULL_WALK:
                ah.playAnimationIfNotPlaying(AnimationType.ExploreWalk, {
                    animation: AnimationType.ExploreWalk,
                    loop: true,
                    priority: Enum.AnimationPriority.Movement,
                    weightAtom: atom(2),
                    update: true,
                });
                break;
            case CState.TALKING:
                break;
        }
    }

    protected accelerationTracker(dt: number) {
        const humanoid = this.humanoid;
        const isRunning = this.walkingDirection.Magnitude > 0;
        const curAcc = this.acc();
        const curSpd = humanoid.WalkSpeed;
        if (isRunning) {
            if (curAcc < this.maxAcc) {
                this.acc(math.min(curAcc + dt * this.accSpeed, this.maxAcc));
                if (this.state === CState.IDLE) {
                    this.state = CState.START_WALK;
                }
            } else {
                this.state = CState.FULL_WALK;
            }
        } else {
            if (curSpd > 0) {
                this.state = CState.DECELERATE;
                this.acc(curAcc - (dt * 5 * math.random()));
            } else {
                this.state = CState.IDLE;
                this.acc(0);
            }
        }
        humanoid.WalkSpeed = this.maxWalkSpeed * math.clamp(curAcc, 0, this.maxAcc);
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