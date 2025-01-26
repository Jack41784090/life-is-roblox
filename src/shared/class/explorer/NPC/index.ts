import { atom, Atom } from "@rbxts/charm";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import AnimationHandler, { AnimationType } from "shared/class/battle/Entity/Graphics/AnimationHandler";
import { NPCConfig } from "shared/types/explorer-types";
import Place from "../Place";

enum NPCState {
    IDLE,
    WALKING,
    TALKING,
}

export default class NPC {
    private id: string;
    private model: Model = new Instance('Model')
    private humanoid: Humanoid;
    private walkSpeedFractionAtom: Atom<number>;
    private walkSpeedTracker: RBXScriptConnection;
    private animator: Animator;
    private associatedPlace: Place;

    private walkingDirection: Vector3 = new Vector3();

    private connections: Array<(() => void)> = [];

    private animationHandler: AnimationHandler;
    private state: NPCState = NPCState.IDLE;

    constructor(config: NPCConfig, place: Place) {
        this.id = config.id;
        this.associatedPlace = place;
        this.spawnIn(config);

        const humanoid = this.model.WaitForChild('Humanoid') as Humanoid;
        assert(humanoid.IsA('Humanoid'), `Humanoid not found in model '${this.id}'`);
        const animator = humanoid.WaitForChild('Animator') as Animator;
        assert(animator.IsA('Animator'), `Animator not found in model '${this.id}'`);
        this.animationHandler = new AnimationHandler(humanoid, animator, this.model);
        this.humanoid = humanoid;
        this.animator = animator;
        this.walkSpeedFractionAtom = atom(humanoid.WalkSpeed / this.sprintSpeed);
        this.walkSpeedTracker = this.humanoid.GetPropertyChangedSignal('WalkSpeed').Connect(() => {
            this.walkSpeedFractionAtom(this.humanoid.WalkSpeed / this.sprintSpeed);
        })

        this.initialiseAnimations();
    }

    private spawnIn(config: NPCConfig) {
        const template = ReplicatedStorage.WaitForChild('Models').WaitForChild("NPCs").WaitForChild(this.id) as Model;
        assert(template.IsA('Model'), `Model '${this.id}' not found`);

        this.model = template.Clone();
        this.model.Parent = this.associatedPlace.getModel();
        this.model.Name = config.displayName;
        this.model.PrimaryPart!.CFrame = new CFrame(config.spawnLocation);
    }

    private initialiseAnimations() {
        RunService.RenderStepped.Connect(dt => {
            this.trackStateChange();
            this.followPlayerScript();
            this.accelerationTracker(dt);
        })
    }

    // private debounceTime = 0.2; // Debounce duration in seconds
    // private lastStateChangeTime = 0; // Tracks the last state change time
    private trackStateChange() {
        const ah = this.animationHandler;
        // const currentTime = tick(); // Get current time in seconds

        // // Check if enough time has passed since the last state change
        // if (currentTime - this.lastStateChangeTime < this.debounceTime) {
        //     return; // Exit if debounce duration hasn't passed
        // }

        // this.lastStateChangeTime = currentTime; // Update the last state change time
        switch (this.state) {
            case NPCState.IDLE:
                if (ah.getIfPlaying(AnimationType.Move)) {
                    // print('stopping move');
                    ah.killAnimation(AnimationType.Move);
                }
                break;
            case NPCState.WALKING:
                if (!ah.getIfPlaying(AnimationType.Move)) {
                    // print('playing move');
                    ah.playAnimation(AnimationType.Move, {
                        animation: 'move',
                        loop: true,
                        weightAtom: this.walkSpeedFractionAtom,
                    });
                }
                break;
            case NPCState.TALKING:
                break;
        }
    }

    private followPlayerScript() {
        const playerPos = Players.LocalPlayer.Character!.PrimaryPart!.Position;
        const thisPos = this.model.PrimaryPart!.Position;

        const diff = playerPos.sub(thisPos);
        if (diff.Magnitude > 5) {
            this.startMoving(diff.Unit);
        }
        else {
            this.stopMoving();
        }
    }

    private startMoving(vector: Vector3) {
        this.state = NPCState.WALKING;
        this.walkingDirection = vector;
        this.humanoid.Move(vector);
    }

    private stopMoving() {
        this.walkingDirection = new Vector3();
        // this.humanoid.Move(new Vector3()); // we don't use this because we want to decelerate
    }

    private sprintSpeed: number = 12;
    private maxAcc: number = 1;
    private acc: Atom<number> = atom(0);
    private accelerationTracker(dt: number) {
        const humanoid = this.humanoid;
        const isRunning = this.walkingDirection.Magnitude > 0;
        const curAcc = this.acc();
        const curSpd = humanoid.WalkSpeed;
        if (isRunning) {
            // accelerate
            if (curAcc < this.maxAcc) this.acc(math.min(curAcc + dt * 2, this.maxAcc));
        }
        else {
            // decelerate
            if (curSpd > 0) {
                this.acc(curAcc - (dt * 5 * math.random()));
            }
            else {
                this.state = NPCState.IDLE;
                this.acc(0);
            }
        }

        humanoid.WalkSpeed = this.sprintSpeed * math.clamp(curAcc, 0, this.maxAcc);

        // print(`spd: ${humanoid.WalkSpeed}, acc: ${curAcc}`);
    }

    public destroy() {
        this.model.Destroy();
        this.connections.forEach(conn => conn());
    }
}
