import { atom, Atom } from "@rbxts/charm";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import AnimationHandler, { AnimationType } from "shared/class/battle/State/Entity/Graphics/AnimationHandler";
import Place from "../Place";
import { NPCConfig } from "./types";

enum NPCState {
    IDLE,
    WALKING,
    TALKING,
}

export default class NPC {
    private associatedPlace: Place;

    //#region infra
    private id: string;
    private model: Model = new Instance('Model')
    private humanoid: Humanoid;
    private animationHandler: AnimationHandler;
    private connections: Array<(() => void)> = [];
    private state: NPCState = NPCState.IDLE;
    //#endregion

    //#region walking
    private walkSpeedFractionAtom: Atom<number>;
    private walkSpeedTracker: RBXScriptConnection;
    private walkingDirection: Vector3 = new Vector3();
    private sprintSpeed: number = 12;
    private maxAcc: number = 1;
    private acc: Atom<number> = atom(0);
    //#endregion

    //#region personality
    // private npcwants: NPCWant;
    // private npcbevr: NPCBehaviorProfile;
    // private npcpers: NPCPersonality;
    //#endregion

    constructor(config: NPCConfig, place: Place) {
        this.id = config.id;
        this.associatedPlace = place;
        this.spawn(config);

        const humanoid = this.model.WaitForChild('Humanoid') as Humanoid;
        assert(humanoid.IsA('Humanoid'), `Humanoid not found in model '${this.id}'`);
        const animator = humanoid.WaitForChild('Animator') as Animator;
        assert(animator.IsA('Animator'), `Animator not found in model '${this.id}'`);
        this.animationHandler = new AnimationHandler(humanoid, animator, this.model);
        this.humanoid = humanoid;
        this.walkSpeedFractionAtom = atom(humanoid.WalkSpeed / this.sprintSpeed);
        this.walkSpeedTracker = this.humanoid.GetPropertyChangedSignal('WalkSpeed').Connect(() => {
            this.walkSpeedFractionAtom(this.humanoid.WalkSpeed / this.sprintSpeed);
        })

        // this.npcwants = config.npcwant;
        // this.npcbevr = config.npcbevr;
        // this.npcpers = config.npcpers;

        this.initialiseAnimations();
    }

    private spawn(config: NPCConfig) {
        const template = ReplicatedStorage.WaitForChild('Models').WaitForChild("NPCs").WaitForChild(this.id) as Model;
        assert(template.IsA('Model'), `Model '${this.id}' not found`);

        this.model = template.Clone();
        this.model.Parent = this.associatedPlace.getModel();
        this.model.Name = config.displayName;
        this.model.PrimaryPart!.CFrame = new CFrame(config.spawnLocation);
    }

    private initialiseAnimations() {
        RunService.RenderStepped.Connect(dt => {
            this.stateChangeTracker();
            this.accelerationTracker(dt);
            this.followPlayerScript();
        })
    }

    private stateChangeTracker() {
        const ah = this.animationHandler;
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

    private startMoving(vector: Vector3) {
        this.state = NPCState.WALKING;
        this.walkingDirection = vector;
        this.humanoid.Move(vector);
    }

    private stopMoving() {
        this.walkingDirection = new Vector3();
        // this.humanoid.Move(new Vector3()); // we don't use this because we want to decelerate
    }

    public destroy() {
        this.model.Destroy()
        this.walkSpeedTracker.Disconnect()
        this.animationHandler?.destroy()
        this.connections.forEach(conn => conn())
    }
}
