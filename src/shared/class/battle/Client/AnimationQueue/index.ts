import { promiseWrapper } from "shared/utils";
import Logger from "shared/utils/Logger";
import EntityGraphics from "../../State/Entity/Graphics";
import { AnimationType } from "../../State/Entity/Graphics/AnimationHandler";
import { EntityStatus, NeoClashResult, StrikeSequence } from "../../types";
import CombatEffectsService from "../Effects/CombatEffectsServices";
import BattleAnimation from "./BattleAnimation";
import { iBattleAnimation } from "./type";

export default class BattleAnimationManager {
    private logger = Logger.createContextLogger("AnimationQueue");
    private queue: BattleAnimation[] = [];
    private isProcessing = false;
    private currentAnimation?: BattleAnimation;

    constructor() {

    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.size() === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.queue.size() > 0) {
                const nextAnimation = this.queue.shift();
                if (!nextAnimation) break;

                this.currentAnimation = nextAnimation;
                this.logger.debug(`Starting animation: ${nextAnimation.name}`); try {
                    await nextAnimation.awaitingPromise();
                    this.logger.debug(`Animation ${nextAnimation.name} completed successfully`);
                } catch (error) {
                    this.logger.warn(`Animation ${nextAnimation.name} failed:`, tostring(error));

                    // Report detailed error information to help with debugging
                    this.reportError(nextAnimation, error as defined);
                }

                this.currentAnimation = undefined;
            }
        } finally {
            this.isProcessing = false;
            this.currentAnimation = undefined;
        }
    }

    public queueAnimation(animation: iBattleAnimation) {
        this.queue.push(new BattleAnimation(animation));
        this.processQueue();
    }
    public async waitForAllAnimationsToEnd(): Promise<void> {
        if (this.queue.size() === 0 && !this.isProcessing) {
            this.logger.debug("No animations to wait for");
            return;
        }

        this.logger.debug("Waiting for all animations to end");

        return new Promise<void>((resolve) => {
            // Create a local function that checks if animations are complete
            const checkComplete = () => {
                if (this.queue.size() === 0 && !this.isProcessing) {
                    this.logger.debug("All animations ended");
                    resolve();
                    return;
                }

                // Use task.delay instead of recursive calls to prevent stack overflow
                task.delay(0.1, checkComplete);
            };

            // Start checking
            checkComplete();
        });
    }

    public getCurrentAnimation(): string | undefined {
        return this.currentAnimation?.name;
    }

    public getQueueSize(): number {
        return this.queue.size();
    }
    public isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    public clearQueue(): void {
        this.logger.debug(`Clearing queue with ${this.queue.size()} animations`);
        this.queue.clear();
    }

    public getQueueInfo(): { currentAnimation?: string; queueSize: number; isProcessing: boolean } {
        return {
            currentAnimation: this.currentAnimation?.name,
            queueSize: this.queue.size(),
            isProcessing: this.isProcessing
        };
    }

    public async handleMoveAnimation(mover: EntityGraphics, fromWorldLocation: Vector3, toWorldLocation: Vector3) {
        this.logger.debug("Animating movement from ", fromWorldLocation, " to ", toWorldLocation);
        const [promise, resolver] = promiseWrapper(mover.moveToPosition(fromWorldLocation));
        this.queueAnimation({
            name: `handleMoveAnimation of ${mover.name} to ${fromWorldLocation}`,
            promise,
            promise_resolve: resolver,
            timeout: 5,
        });

        const [promise_2, resolver_2] = promiseWrapper(mover.moveToPosition(toWorldLocation));
        this.queueAnimation({
            name: `handleMoveAnimation of ${mover.name} to ${toWorldLocation}`,
            promise: promise_2,
            promise_resolve: resolver_2,
            timeout: 5,
        })
    }

    public async handleClashes(attacker: EntityGraphics, target: EntityGraphics, clashes: StrikeSequence[]): Promise<void> {
        this.logger.debug("Animating clashes", clashes, "BattleClient");
        for (const clash of clashes) {
            const [promise, resolver] = promiseWrapper(this.OneSequence(attacker, target, clash));
            this.queueAnimation({
                name: `handleClash of ${attacker.name} vs ${target.name}`,
                promise,
                promise_resolve: resolver,
                timeout: 5,
            });
            await promise;
        }
    }

    private async animateRolls(attacker: EntityGraphics, target: EntityGraphics, clash: NeoClashResult): Promise<void> {
        const { roll, against, toSurmount, bonus, fate } = clash.result;

        const combatEffects = CombatEffectsService.getInstance();

        const attackerHead = attacker.model.FindFirstChild("Head");
        const attackerHeadPos =
            attackerHead && attackerHead.IsA("BasePart") ? attackerHead.Position :
                attacker.model.PrimaryPart ? attacker.model.PrimaryPart.Position : undefined;

        const targetHead = target.model.FindFirstChild("Head");
        const targetHeadPos =
            targetHead && targetHead.IsA("BasePart") ? targetHead.Position :
                target.model.PrimaryPart ? target.model.PrimaryPart.Position : undefined;


        const attackerScreenPos = attackerHeadPos ? this.worldToScreenPosition(attackerHeadPos) : undefined;
        const targetScreenPos = targetHeadPos ? this.worldToScreenPosition(targetHeadPos) : undefined;

        // Show rolls
        if (attackerScreenPos) {
            // Show attack roll
            combatEffects.showAbilityReaction(
                new UDim2(attackerScreenPos.X.Scale, attackerScreenPos.X.Offset, attackerScreenPos.Y.Scale, attackerScreenPos.Y.Offset - 30),
                new Color3(1, 0.2, 0),
                `🤺${roll + bonus}`
            );
        }

        if (attackerScreenPos && targetScreenPos) {
            const averagePos = attackerScreenPos.Lerp(targetScreenPos, 0.5);
            combatEffects.showAbilityReaction(
                averagePos,
                new Color3(1, 0.2, 0),
                `${clash.result.fate}`
            )
        }

        // Damage texts
        if (targetScreenPos) {
            // Show defence
            combatEffects.showAbilityReaction(
                new UDim2(targetScreenPos.X.Scale, targetScreenPos.X.Offset, targetScreenPos.Y.Scale, targetScreenPos.Y.Offset - 30),
                new Color3(0, 0.2, 1),
                `${against === 'DV' ? '🏃‍♂️' : '🛡️'} ${toSurmount}`
            );

            // Show impact effect
            const impactSize = clash.result.fate === "CRIT" ? 50 : 30;
            combatEffects.showHitImpact(targetScreenPos, new Color3(1, 0, 0), impactSize);

            // Show damage indicator if the attack hit
            if (clash.result.damage && clash.result.fate !== "Miss" && clash.result.fate !== "Cling") {
                const damage = clash.result.damage;

                // Show critical hit effect if applicable
                if (clash.result.fate === "CRIT") {
                    combatEffects.showAbilityReaction(
                        new UDim2(targetScreenPos.X.Scale, targetScreenPos.X.Offset, targetScreenPos.Y.Scale, targetScreenPos.Y.Offset - 30),
                        new Color3(1, 0.8, 0),
                        "CRITICAL!"
                    );
                }

                task.delay(.5, () => {
                    combatEffects.showDamage(targetScreenPos, damage);
                })
            } else {
                combatEffects.showAbilityReaction(targetScreenPos, new Color3(0.7, 0.7, 0.7), clash.result.fate);
            }
        }
    }

    private async OneSequence(attacker: EntityGraphics, target: EntityGraphics, strikeSequence: StrikeSequence): Promise<unknown> {
        const clashKills = false; // TODO

        if (!attacker || !target) {
            this.logger.warn(`[playAttackAnimation] ${!attacker ? "Attacker" : ""} ${!target ? "Target" : ""} not found`);
            return;
        }
        const targetAnimationHandler = target.animationHandler;

        // 1. Target will face the attacker and play the defend animation while the attacker plays the attack animation.
        await target.faceEntity(attacker);
        const defendIdleAnimation = target.playAnimation(
            AnimationType.Defend,
            {
                animation: "defend",
                priority: Enum.AnimationPriority.Action2,
                loop: false,
            });

        // 2. First phase: the attacks that miss-- play the attack animation quickly as the defender dodges.
        let clash: NeoClashResult | undefined = strikeSequence.shift();
        while (clash && clash.result.fate === "Miss") {
            const attackAnimation = attacker.playAnimation(
                AnimationType.Attack,
                {
                    animation: 'swing',
                    priority: Enum.AnimationPriority.Action4,
                    loop: false,
                });

            if (!attackAnimation) {
                this.logger.warn("[playAttackAnimation] Attacker animation track not found.");
                break;
            }

            attackAnimation.AdjustSpeed(2);
            const _clash = { ...clash };
            this.waitForAnimationMarker(attackAnimation, "Hit").then(() => {
                this.animateRolls(attacker, target, _clash);
                target.playAnimation(
                    AnimationType.Defend,
                    {
                        animation: "dodge",
                        priority: Enum.AnimationPriority.Action3,
                        loop: false,
                    })
            })
            clash = strikeSequence.shift();
            wait(0.25);
        }

        // 2.5 Inform the players attacks that didn't miss
        while (clash && clash.result.against === 'DV' && clash.result.fate !== "Miss") {
            this.animateRolls(attacker, target, clash);
            clash = strikeSequence.shift();
        }

        // 3. Second phase: the attacks that hit-- once the attacker hits the target,
        // the target will focus on defending himself 
        while (clash && clash.result.fate !== "Miss") {
            const attackAnimation = attacker.playAnimation(
                AnimationType.Attack,
                {
                    animation: 'swing',
                    priority: Enum.AnimationPriority.Action4,
                    loop: false,
                });

            if (!attackAnimation) {
                this.logger.warn("[playAttackAnimation] Attacker animation track not found.");
                break;
            }

            await this.waitForAnimationMarker(attackAnimation, "Hit");
            attackAnimation?.AdjustSpeed(0);
            defendIdleAnimation?.AdjustSpeed(0);

            this.animateRolls(attacker, target, clash);

            // 3. Play the appropriate animation based on the outcome of the attack.
            wait(0.25);
            defendIdleAnimation?.AdjustSpeed(1);
            attackAnimation?.AdjustSpeed(1);

            if (clashKills) {
                targetAnimationHandler.killAnimation(AnimationType.Idle);
                targetAnimationHandler.killAnimation(AnimationType.Defend);
                const deathPoseIdleAnimation = target.playAnimation(
                    AnimationType.Idle,
                    {
                        animation: "death-idle",
                        priority: Enum.AnimationPriority.Idle,
                        loop: true,
                    })
                const deathAnimation = target.playAnimation(
                    AnimationType.Hit,
                    {
                        animation: "death",
                        priority: Enum.AnimationPriority.Action3,
                        loop: false,
                    });

                return this.waitForAnimationEnd(deathAnimation);
            }
            else {
                const gotHitAnimation = target.playAnimation(
                    AnimationType.Hit,
                    {
                        animation: 'defend-hit',
                        priority: Enum.AnimationPriority.Action3,
                        loop: false,
                    });

                await this.waitForAnimationEnd(attackAnimation);
                await this.waitForAnimationEnd(gotHitAnimation);

                const transitionTrack = target.playAnimation(
                    AnimationType.Transition,
                    {
                        animation: "defend->idle",
                        priority: Enum.AnimationPriority.Action4,
                        loop: false,
                    });
                const refreshedIdleAnimation = target.playAnimation(
                    AnimationType.Idle,
                    {
                        animation: "idle",
                        priority: Enum.AnimationPriority.Idle,
                        loop: true,
                    })

                return this.waitForAnimationEnd(transitionTrack);
            }
        }

        attacker.playAudio(EntityStatus.Idle);
    }
    private reportError(animation: BattleAnimation, err: defined): void {
        this.logger.warn({
            animation: animation.name,
            duration: animation.getDuration(),
            error: tostring(err),
            queueState: {
                size: this.queue.size(),
                processing: this.isProcessing,
                currentAnimation: this.currentAnimation?.name
            }
        });
    }

    private worldToScreenPosition(worldPos: Vector3): UDim2 {
        const camera = game.Workspace.CurrentCamera;
        if (!camera) return new UDim2(0.5, 0, 0.5, 0);

        const [screenPos, isVisible] = camera.WorldToScreenPoint(worldPos);
        return new UDim2(0, screenPos.X, 0, screenPos.Y);
    }

    private async waitForAnimationMarker(track: AnimationTrack, markerName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const connection = track.GetMarkerReachedSignal(markerName).Once(() => {
                resolve("Animation marker reached: " + markerName);
            });

            wait(5);
            if (connection.Connected) {
                connection.Disconnect();
                reject("Wait for animation marker timed out");
            }
        });
    }

    private async waitForAnimationEnd(track?: AnimationTrack): Promise<string> {
        this.logger.debug("TRACK", track?.Name, "Waiting end", track);
        if (!track) return Promise.resolve("No track to wait for");
        return new Promise((resolve) => {
            track.Ended.Once(() => {
                this.logger.debug("TRACK", track?.Name, "Animation ended", track);
                resolve("Animation ended: " + track?.Name);
            });
        });
    }
}