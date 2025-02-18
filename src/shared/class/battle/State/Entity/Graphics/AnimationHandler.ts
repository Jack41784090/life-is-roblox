import { atom, Atom, subscribe } from "@rbxts/charm";
import { Debris, RunService } from "@rbxts/services";
import EntityGraphics from ".";
import Expression from "./Expression";

export enum AnimationType {
    Move = "move",
    Sprint = "sprint",
    Idle = "idle",
    Blink = "blink",
    Attack = "attack",
    Defend = "defend",
    Hit = "hit",
    Death = "death",
    Victory = "victory",
    Defeat = "defeat",
    Transition = "transition",
}

export interface AnimationOptions {
    animation: string;
    loop: boolean;
    weightAtom?: Atom<number>;
    atomInterpreter?: (atom: Atom<number>) => number;
    priority?: Enum.AnimationPriority;
    hold?: number;
    update?: boolean;
}

export default class AnimationHandler {
    private connections: Array<RBXScriptConnection | (() => void)> = [];
    private entity?: EntityGraphics;
    private humanoid: Humanoid
    private animator: Animator;
    private model: Model;

    private idleBlinkingThread?: thread;
    private animatioDataMap: Map<string, Animation> = new Map();
    private playingTrackMap: Map<AnimationType, AnimationTrack> = new Map();
    private expression?: Expression;

    constructor(humanoid: Humanoid, animator: Animator, model: Model) {
        print(`[AnimationHandler] Constructing animation handler for: ${model}`);
        this.humanoid = humanoid;
        this.animator = animator;
        this.model = model;
        this.initialise();


        // this.debug();

    }

    private prevSize = 0;
    private debug() {
        RunService.RenderStepped.Connect(() => {
            const size = this.playingTrackMap.size();
            if (size !== this.prevSize) {
                print(`[AnimationHandler: ${this.model.Name}] ${this.model.Name} has ${size} animations playing.`, this.playingTrackMap);
                this.prevSize = size;
            }
        })
    }

    public static Create(entity: EntityGraphics): AnimationHandler | undefined {
        print(`[AnimationHandler] Creating animation handler for entity: ${entity}`);
        const model = entity.model;
        if (!model) {
            warn("[AnimationHandler: ${this.model.Name}] Model not found for entity.");
            return;
        }

        const humanoid = model.FindFirstChildOfClass("Humanoid") as Humanoid;
        if (!humanoid) {
            warn("[AnimationHandler: ${this.model.Name}] Humanoid not found in model.");
            return;
        }

        const animator = humanoid.FindFirstChildOfClass("Animator") as Animator;
        if (!animator) {
            warn("[AnimationHandler: ${this.model.Name}] Animator not found in humanoid.");
            return;
        }

        return new AnimationHandler(humanoid, animator, model);
    }

    /**
     * initialises the AnimationHandler by setting up the animator, loading animations,
     * initializing expressions, and starting the idle animation.
     */
    private initialise(): void {
        this.loadAnimations(this.model);
        this.initialiseExpression();

        RunService.RenderStepped.Connect(() => {
            this.playingTrackMap.forEach((track, animType) => {
                if (!track.IsPlaying) {
                    this.killAnimation(animType);
                }
            })
        })
    }

    /**
     * Loads animations from the model's 'anim' folder into the animation map.
     * @param model The model containing the animations.
     */
    private loadAnimations(model: Model): void {
        const animationFolder = model.FindFirstChild("anim") as Folder;
        if (!animationFolder) {
            warn("[AnimationHandler: ${this.model.Name}] Animation folder 'anim' not found in model.");
            return;
        }

        animationFolder.GetChildren().forEach((child) => {
            if (child.IsA("Animation")) {
                this.animatioDataMap.set(child.Name, child);
            }
        });

        // this.playingTrackMap.set(AnimationType.Idle, this.loadAnimationTrack("idle")!);
        // this.playingTrackMap.set(AnimationType.Blink, this.loadAnimationTrack("blink")!);
    }

    /**
     * Loads an animation track by name.
     * @param animationName The name of the animation to load.
     * @returns The loaded AnimationTrack, or undefined if not found.
     */
    private loadAnimationTrack(animationName: string): AnimationTrack | undefined {
        const animation = this.animatioDataMap.get(animationName);
        if (!animation) {
            warn(`[AnimationHandler: ${this.model.Name}] Animation '${animationName}' not found.`);
            return undefined;
        }
        if (!this.animator) {
            warn("[AnimationHandler: ${this.model.Name}] Animator is not initialised.");
            return undefined;
        }
        const loadedTrack = this.animator.LoadAnimation(animation);;
        return loadedTrack;
    }

    /**
     * initialises the expression system and starts the blinking thread.
     */
    private initialiseExpression(): void {
        if (!this.entity) return;
        this.expression = new Expression(this.entity);
        this.startBlinking();
    }

    /**
     * Starts the blinking loop.
     */
    private startBlinking(): void {
        if (this.idleBlinkingThread) return; // Prevent multiple threads

        this.idleBlinkingThread = task.spawn(() => {
            while (true) {
                wait(math.random(5, 10));
                const blinkAnimationTrack = this.playingTrackMap.get(AnimationType.Blink);
                if (blinkAnimationTrack && this.expression) {
                    this.expression.blink(blinkAnimationTrack);
                }
            }
        });
    }

    /**
     * Stops the blinking loop.
     */
    public stopBlinking(): void {
        if (this.idleBlinkingThread) {
            task.cancel(this.idleBlinkingThread);
            this.idleBlinkingThread = undefined;
        }
    }

    public playAnimationIfNotPlaying(animType: AnimationType, options: AnimationOptions): AnimationTrack | undefined {
        if (this.isPlaying(animType)) {
            // print(`[AnimationHandler: ${this.model.Name}] Animation ${animationName} is already playing.`);
            if (options.update) {
                this.updatePlayingAnimation(animType, options);
            }
            return this.playingTrackMap.get(animType);
        }
        return this.playAnimation(animType, options);
    }

    public updatePlayingAnimation(animType: AnimationType, options: AnimationOptions): void {
        const playingTrack = this.playingTrackMap.get(animType);
        if (!playingTrack) {
            warn(`[AnimationHandler: ${this.model.Name}] Animation track ${animType} not found.`);
            return;
        }

        playingTrack.Priority = options.priority ?? Enum.AnimationPriority.Action;
        playingTrack.Looped = options.loop;
        if (options.weightAtom) {
            this.adjustWeight(playingTrack, options.weightAtom, options.atomInterpreter);
        }
        if (options.animation !== playingTrack.Name) {
            const newAnimation = this.loadAnimationTrack(options.animation);
            if (newAnimation) {
                this.transitionIntoNewAnimation(animType, newAnimation);
            }
        }
    }

    private transitionIntoNewAnimation(animType: AnimationType, newAnimation: AnimationTrack) {
        const playingTrack = this.playingTrackMap.get(animType);
        if (!playingTrack) {
            warn(`[AnimationHandler: ${this.model.Name}] Expected playing track for ${animType} not found.`);
            return;
        }
        print(`[AnimationHandler: ${this.model.Name}] ${animType}: "${playingTrack.Name}" => "${newAnimation.Name}"`);
        const position = playingTrack.TimePosition / playingTrack.Length;
        playingTrack.Name = newAnimation.Name;
        playingTrack.Stop(.2);
        newAnimation.TimePosition = math.floor(position * newAnimation.Length);
        newAnimation.Play(.2);

        return this.playingTrackMap.set(animType, newAnimation);
    }

    private adjustWeight(track: AnimationTrack, weightAtom: Atom<number>, atomInterpreter: ((atom: Atom<number>) => number) = atom => atom()): void {
        const weight = atomInterpreter(weightAtom);
        // print(`[AnimationHandler: ${this.model.Name}] Adjusting weight: ${track.Name} to ${weight}`);
        if (weight <= 1) {
            track.AdjustWeight(weight);
        }
        else if (weight > 1) {
            track.AdjustWeight(1);
            track.AdjustSpeed(weight);
        }

        const cu = subscribe(weightAtom, (s) => {
            const updatedWeight = atomInterpreter(atom(s));
            // print(`[AnimationHandler: ${this.model.Name}] Adjusting weight: ${track.Name} to ${updatedWeight}`);
            if (track.IsPlaying) {
                if (updatedWeight <= 1) {
                    track.AdjustWeight(updatedWeight);
                }
                else if (updatedWeight > 1) {
                    track.AdjustWeight(1);
                    track.AdjustSpeed(updatedWeight);
                }
            }
            else {
                cu();
            }
        });
        this.connections.push(cu);
    }

    /**
     * Plays an animation based on the provided options.
     * @param options The animation options.
     * @returns The AnimationTrack if successfully played, undefined otherwise.
     */
    public playAnimation(id: AnimationType, options: AnimationOptions): AnimationTrack | undefined {
        print(`[AnimationHandler: ${this.model.Name}]: Playing animation [${id}] with options:`, options);
        const { animation, priority = Enum.AnimationPriority.Action, hold = 0, loop } = options;

        const track = this.loadAnimationTrack(animation);
        if (track) {
            this.killAnimationIfPlaying(id);
            this.playingTrackMap.set(id, track);

            track.Looped = loop;
            track.Priority = priority;
            track.Play();


            if (options.weightAtom) {
                this.adjustWeight(track, options.weightAtom, options.atomInterpreter);
            }

            track.Stopped.Once(() => {
                print(`[playAnimation] Track {${id}} stopped`);
            })

        }

        return track;
    }

    /**
     * Plays a hold animation after the initial animation has stopped.
     * @param animationName The base name of the animation.
     * @param holdDuration The duration to hold the animation.
     */
    // private playHoldAnimation(animationName: string, holdDuration: number): void {
    //     task.spawn(() => {
    //         const holdAnimationName = `${animationName}-idle`;
    //         const holdTrack = this.loadAnimationTrack(holdAnimationName);
    //         if (!holdTrack) return;

    //         const initialTrack = this.loadAnimationTrack(animationName);
    //         initialTrack?.Stopped.Wait();

    //         holdTrack.Priority = Enum.AnimationPriority.Action4;
    //         holdTrack.Looped = true;
    //         holdTrack.Play();
    //         wait(holdDuration);
    //         holdTrack.Stop();
    //     });
    // }

    /**
     * Plays the idle animation.
     */
    public playIdleAnimation(): void {
        const idleTrack = this.playingTrackMap.get(AnimationType.Idle);
        if (idleTrack) {
            idleTrack.Play();
        }
        else {
            warn("[AnimationHandler: ${this.model.Name}] Idle animation track not found.");
            this.playAnimation(AnimationType.Idle, { animation: "idle", loop: true });
        }
    }

    /**
     * Plays the blink animation.
     */
    public playBlinkAnimation(): void {
        const blinkTrack = this.playingTrackMap.get(AnimationType.Blink);
        if (blinkTrack) {
            blinkTrack.Play();
        }
        else {
            warn("[AnimationHandler: ${this.model.Name}] Blink animation track not found.");
            this.playingTrackMap.set(AnimationType.Blink, this.loadAnimationTrack("blink")!);
        }
    }

    public killAnimationIfPlaying(animationName: AnimationType): void {
        if (this.isPlaying(animationName)) {
            this.killAnimation(animationName);
        }
    }

    public killAnimation(animType: AnimationType): void {
        print(`[AnimationHandler: ${this.model.Name}] Killing animation ${animType}`);
        const animation: AnimationTrack | undefined = this.playingTrackMap.get(animType);
        if (!animation) return;
        task.spawn(() => {
            animation.Stop();
            Debris.AddItem(animation, 5);
        });
        this.playingTrackMap.delete(animType);
    }

    /**
     * Cleans up the AnimationHandler by stopping animations and threads.
     */
    public destroy() {
        this.stopBlinking()
        this.expression = undefined

        // Cleanup connections
        this.connections.forEach(connection => {
            if (typeIs(connection, "function")) connection()
            else connection.Disconnect()
        })

        // Cleanup tracks
        this.playingTrackMap.forEach((track, animtype) => {
            this.killAnimation(animtype);
        })
    }


    public getHumanoid(): Humanoid {
        return this.humanoid;
    }

    public getTrack(name: AnimationType): AnimationTrack | undefined {
        return this.playingTrackMap.get(name);
    }

    public isPlaying(animationName: AnimationType): boolean {
        const track = this.playingTrackMap.get(animationName);
        return track ? track.IsPlaying : false;
    }
}
