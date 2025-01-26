import { Atom, subscribe } from "@rbxts/charm";
import EntityGraphics from ".";
import Expression from "./Expression";

export enum AnimationType {
    Move = "move",
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
    priority?: Enum.AnimationPriority;
    hold?: number;
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
        this.humanoid = humanoid;
        this.animator = animator;
        this.model = model;
        this.initialise();
    }

    public static Create(entity: EntityGraphics): AnimationHandler | undefined {
        const model = entity.model;
        if (!model) {
            warn("[AnimationHandler] Model not found for entity.");
            return;
        }

        const humanoid = model.FindFirstChildOfClass("Humanoid") as Humanoid;
        if (!humanoid) {
            warn("[AnimationHandler] Humanoid not found in model.");
            return;
        }

        const animator = humanoid.FindFirstChildOfClass("Animator") as Animator;
        if (!animator) {
            warn("[AnimationHandler] Animator not found in humanoid.");
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
        this.playIdleAnimation();
    }

    /**
     * Loads animations from the model's 'anim' folder into the animation map.
     * @param model The model containing the animations.
     */
    private loadAnimations(model: Model): void {
        const animationFolder = model.FindFirstChild("anim") as Folder;
        if (!animationFolder) {
            warn("[AnimationHandler] Animation folder 'anim' not found in model.");
            return;
        }

        animationFolder.GetChildren().forEach((child) => {
            if (child.IsA("Animation")) {
                this.animatioDataMap.set(child.Name, child);
            }
        });

        this.playingTrackMap.set(AnimationType.Idle, this.loadAnimationTrack("idle")!);
        this.playingTrackMap.set(AnimationType.Blink, this.loadAnimationTrack("blink")!);
    }

    /**
     * Loads an animation track by name.
     * @param animationName The name of the animation to load.
     * @returns The loaded AnimationTrack, or undefined if not found.
     */
    private loadAnimationTrack(animationName: string): AnimationTrack | undefined {
        const animation = this.animatioDataMap.get(animationName);
        if (!animation) {
            warn(`[AnimationHandler] Animation '${animationName}' not found.`);
            return undefined;
        }
        if (!this.animator) {
            warn("[AnimationHandler] Animator is not initialised.");
            return undefined;
        }
        const loadedTrack = this.animator.LoadAnimation(animation);;
        this.playingTrackMap.set(animationName as AnimationType, loadedTrack);

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

    /**
     * Plays an animation based on the provided options.
     * @param options The animation options.
     * @returns The AnimationTrack if successfully played, undefined otherwise.
     */
    public playAnimation(id: AnimationType, options: AnimationOptions): AnimationTrack | undefined {
        const { animation, priority = Enum.AnimationPriority.Action, hold = 0, loop } = options;

        const track = this.loadAnimationTrack(animation);
        if (!track) return undefined;

        const existingTrack = this.playingTrackMap.get(id);
        if (existingTrack) {
            this.killAnimation(id);
        }

        track.Looped = loop;
        track.Priority = priority;
        track.Play();

        this.playingTrackMap.set(id, track);

        // if (hold > 0) {
        //     this.playHoldAnimation(animation, hold);
        // }

        if (options.weightAtom) {
            // print(`weight given: ${options.weightAtom()}`);
            const weight = options.weightAtom();
            track.AdjustWeight(weight);
            this.connections.push(subscribe(options.weightAtom, (s) => {
                // print(`Adjusting weight: ${s}`);
                if (track.IsPlaying) {
                    track.AdjustWeight(s);
                }
                else {
                    track.Stop();
                }
            }));
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
            warn("[AnimationHandler] Idle animation track not found.");
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
            warn("[AnimationHandler] Blink animation track not found.");
            this.playingTrackMap.set(AnimationType.Blink, this.loadAnimationTrack("blink")!);
        }
    }


    public killAnimation(animationName: AnimationType): void {
        print(`Killing animation: ${animationName}`);
        const animation: AnimationTrack | undefined = this.playingTrackMap.get(animationName);
        animation?.Stop();
        animation?.Destroy();
        this.playingTrackMap.delete(animationName);
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
        this.playingTrackMap.forEach(track => {
            track.Stop()
            track.Destroy()
        })
    }


    public getHumanoid(): Humanoid {
        return this.humanoid;
    }

    public getIfPlaying(animationName: AnimationType): boolean {
        const track = this.playingTrackMap.get(animationName);
        return track ? track.IsPlaying : false;
    }
}
