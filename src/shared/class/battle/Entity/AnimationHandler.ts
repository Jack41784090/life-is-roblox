import Entity from ".";
import Expression from "./Expression";

export interface AnimationOptions {
    animation: string;
    loop: boolean;
    priority?: Enum.AnimationPriority;
    hold?: number,
}

export default class AnimationHandler {
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