import EntityGraphics from ".";
import Expression from "./Expression";

export enum AnimationType {
    Idle = "idle",
    Blink = "blink",
    Attack = "attack",
    Hit = "hit",
    Death = "death",
    Victory = "victory",
    Defeat = "defeat",
}

export interface AnimationOptions {
    animation: string;
    loop: boolean;
    priority?: Enum.AnimationPriority;
    hold?: number;
}

export default class AnimationHandler {
    private animator?: Animator;
    private idleBlinkingThread?: thread;
    private idleAnimationTrack?: AnimationTrack;
    private blinkAnimationTrack?: AnimationTrack;
    private animationMap: Map<string, Animation> = new Map();
    private expression?: Expression;

    constructor(private entity: EntityGraphics) {
        this.initialise();
    }

    /**
     * initialises the AnimationHandler by setting up the animator, loading animations,
     * initializing expressions, and starting the idle animation.
     */
    private initialise(): void {
        const model = this.entity.model;
        if (!model) {
            warn("[AnimationHandler] Model not found for entity.");
            return;
        }

        const humanoid = model.FindFirstChildOfClass("Humanoid") as Humanoid;
        if (!humanoid) {
            warn("[AnimationHandler] Humanoid not found in model.");
            return;
        }

        this.animator = humanoid.FindFirstChildOfClass("Animator") as Animator;
        if (!this.animator) {
            warn("[AnimationHandler] Animator not found in humanoid.");
            return;
        }

        this.loadAnimations(model);
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
                this.animationMap.set(child.Name, child);
            }
        });

        this.idleAnimationTrack = this.loadAnimationTrack("idle");
        this.blinkAnimationTrack = this.loadAnimationTrack("blink");
    }

    /**
     * Loads an animation track by name.
     * @param animationName The name of the animation to load.
     * @returns The loaded AnimationTrack, or undefined if not found.
     */
    private loadAnimationTrack(animationName: string): AnimationTrack | undefined {
        const animation = this.animationMap.get(animationName);
        if (!animation) {
            warn(`[AnimationHandler] Animation '${animationName}' not found.`);
            return undefined;
        }
        if (!this.animator) {
            warn("[AnimationHandler] Animator is not initialised.");
            return undefined;
        }
        return this.animator.LoadAnimation(animation);
    }

    /**
     * initialises the expression system and starts the blinking thread.
     */
    private initialiseExpression(): void {
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
                if (this.blinkAnimationTrack && this.expression) this.expression.blink(this.blinkAnimationTrack);
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
    public playAnimation(options: AnimationOptions): AnimationTrack | undefined {
        const { animation, priority = Enum.AnimationPriority.Action, hold = 0, loop } = options;

        const track = this.loadAnimationTrack(animation);
        if (!track) return undefined;

        track.Looped = loop;
        track.Priority = priority;
        track.Play();

        if (hold > 0) {
            this.playHoldAnimation(animation, hold);
        }

        return track;
    }

    /**
     * Plays a hold animation after the initial animation has stopped.
     * @param animationName The base name of the animation.
     * @param holdDuration The duration to hold the animation.
     */
    private playHoldAnimation(animationName: string, holdDuration: number): void {
        task.spawn(() => {
            const holdAnimationName = `${animationName}-idle`;
            const holdTrack = this.loadAnimationTrack(holdAnimationName);
            if (!holdTrack) return;

            const initialTrack = this.loadAnimationTrack(animationName);
            initialTrack?.Stopped.Wait();

            holdTrack.Priority = Enum.AnimationPriority.Action4;
            holdTrack.Looped = true;
            holdTrack.Play();
            wait(holdDuration);
            holdTrack.Stop();
        });
    }

    /**
     * Plays the idle animation.
     */
    public playIdleAnimation(): void {
        if (this.idleAnimationTrack) {
            this.idleAnimationTrack.Looped = true;
            this.idleAnimationTrack.Priority = Enum.AnimationPriority.Idle;
            this.idleAnimationTrack.Play();
        } else {
            warn("[AnimationHandler] Idle animation track not found.");
        }
    }

    /**
     * Plays the blink animation.
     */
    public playBlinkAnimation(): void {
        if (this.blinkAnimationTrack) {
            this.blinkAnimationTrack.Play();
        } else {
            warn("[AnimationHandler] Blink animation track not found.");
        }
    }

    public killAnimation(animationName: AnimationType): void {

        let animation: AnimationTrack | undefined;
        switch (animationName) {
            case AnimationType.Idle:
                animation = this.idleAnimationTrack;
                break;
            default:
                return
        }

        animation?.Stop();
        animation?.Destroy();
    }

    /**
     * Cleans up the AnimationHandler by stopping animations and threads.
     */
    public destroy(): void {
        this.stopBlinking();
        this.idleAnimationTrack?.Stop();
        this.blinkAnimationTrack?.Stop();
        this.animationMap.clear();
        this.expression = undefined;
    }
}
