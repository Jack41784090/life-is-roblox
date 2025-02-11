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
    protected nameTag?: BillboardGui;
    private nameTagLabel?: TextBox;
    //#endregion

    //#region walking
    protected hurrying: boolean = false;
    protected walkingDirection: Vector3 = new Vector3();
    protected walkSpeedFractionAtom: Atom<number>;
    protected walkSpeedTracker: RBXScriptConnection;
    protected maxWalkSpeed: number = 8;
    protected maxAcc: number = .25;
    protected acc: Atom<number> = atom(0);
    protected accSpeed: number = .8;
    protected decelerateMultiplier: number = 8.8;
    protected sprintMultiplier: number = 2.5;
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
            this.stateUpdater();
            this.stateChangeTracker();
            this.accelerationTracker(dt);
        });
    }

    private setNametag(mes: string) {
        const textbox = this.nameTagLabel;
        if (textbox) {
            textbox.Text = mes;
        }
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
        this.nameTag = this.model.FindFirstChild('nametag')?.FindFirstChildOfClass('BillboardGui') as BillboardGui;
        this.nameTagLabel = this.nameTag?.FindFirstChildOfClass('TextBox') as TextBox;
        print(this.nameTag, this.nameTagLabel);
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
                ah.killAnimationIfPlaying(AnimationType.Sprint);
                break;
            case CState.START_WALK:
                const existingTransitionTrack = ah.getTrack(AnimationType.Transition);
                if (existingTransitionTrack && existingTransitionTrack.IsPlaying === false) {
                    this.state = CState.ACCELERATE;
                    ah.killAnimation(AnimationType.Transition);
                }
                else {
                    ah.playAnimationIfNotPlaying(AnimationType.Transition, {
                        animation: this.hurrying ? 'explore-idle->sprint' : 'explore-idle->walk',
                        loop: false,
                        priority: Enum.AnimationPriority.Action,
                        weightAtom: this.walkSpeedFractionAtom,
                        atomInterpreter: atom => math.min(atom() * 5, 1),
                        update: true,
                    });
                }
                break;
            case CState.ACCELERATE:
            case CState.DECELERATE:
            case CState.FULL_WALK:
                ah.playAnimationIfNotPlaying(AnimationType.Move, {
                    animation: 'explore-walk',
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    atomInterpreter: atom => {
                        const v = atom();
                        return v < 1 ? v : 1 - (v - 1);
                    },
                    priority: Enum.AnimationPriority.Movement,
                    update: true,
                });
                ah.playAnimationIfNotPlaying(AnimationType.Sprint, {
                    animation: 'explore-sprint',
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    atomInterpreter: atom => math.max(atom() - 1, 0),
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
        const intendOnMoving = this.walkingDirection.Magnitude > 0;
        const topSpeed = intendOnMoving ?
            this.hurrying ? this.maxWalkSpeed * this.sprintMultiplier : this.maxWalkSpeed :
            0;

        const humanoid = this.humanoid;
        const accelerationSpeed = this.accSpeed * (this.hurrying ? this.sprintMultiplier : 1);

        if (currentSpeed < topSpeed) {
            this.acc(math.min(currentAcceleration + dt * accelerationSpeed, this.maxAcc));
        }
        else if (currentSpeed > topSpeed) {
            const randomDeceleration = (dt * accelerationSpeed * math.random())
            if (intendOnMoving) {
                this.acc(math.max(currentAcceleration - randomDeceleration, -.1));
            }
            else {
                this.acc(currentAcceleration - randomDeceleration * this.decelerateMultiplier);
            }
        }

        if (currentSpeed === 0 && currentAcceleration < 0) this.acc(0);

        if (this.hurrying) humanoid.WalkSpeed = math.max(humanoid.WalkSpeed, this.maxWalkSpeed);
        humanoid.WalkSpeed += this.acc();

        this.setNametag(`Speed: ${string.format("%.3f", humanoid.WalkSpeed)}, Acc: ${string.format("%.3f", this.acc())}`);

        // print(`[C: ${this.model.Name}] Speed: ${humanoid.WalkSpeed}, Acc: ${this.acc()}`);

        // Sync state updates based on the latest acceleration and movement input.
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