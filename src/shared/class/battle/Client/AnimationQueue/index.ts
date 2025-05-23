import { RunService } from "@rbxts/services";
import { promiseWrapper } from "shared/utils";
import Logger from "shared/utils/Logger";
import EntityGraphics from "../../State/Entity/Graphics";
import { AnimationType } from "../../State/Entity/Graphics/AnimationHandler";
import { EntityStatus, NeoClashResult } from "../../types";
import CombatEffectsService from "../Effects/CombatEffectsServices";
import BattleAnimation from "./BattleAnimation";
import { iBattleAnimation } from "./type";

export default class BattleAnimationManager {
    private logger = Logger.createContextLogger("AnimationQueue");
    private animating?: Promise<unknown> = Promise.resolve();
    private queue: BattleAnimation[] = [];

    constructor() {
        RunService.RenderStepped.Connect(async () => {
            if (this.animating) {
                return;
            }
            this.animating = this.queue.shift()?.awaitingPromise().then(() => {
                this.animating = undefined;
                this.logger.debug("Animation ended");
            })
        })
    }

    public queueAnimation(animation: iBattleAnimation) {
        this.queue.push(new BattleAnimation(animation))
    }

    public async waitForAllAnimationsToEnd() {
        this.logger.debug("Waiting for all animations to end");
        return new Promise(resolve => {
            const cu = RunService.RenderStepped.Connect(() => {
                if (this.queue.size() === 0) {
                    this.logger.debug("All animations ended");
                    cu.Disconnect();
                    resolve(void 0);
                }
                else {
                    // this.logger.debug(this.queue);
                }
            })
        })
    }

    public async handleMoveAnimation(mover: EntityGraphics, fromWorldLocation: Vector3, toWorldLocation: Vector3) {
        this.logger.debug("Animating movement from ", fromWorldLocation, " to ", toWorldLocation);
        const [promise, resolver] = promiseWrapper(mover.moveToPosition(fromWorldLocation));
        this.queueAnimation({
            promise,
            promise_resolve: resolver,
            timeout: 5,
        });

        const [promise_2, resolver_2] = promiseWrapper(mover.moveToPosition(toWorldLocation));
        this.queueAnimation({
            promise: promise_2,
            promise_resolve: resolver_2,
            timeout: 5,
        })
    }

    public async handleClashes(attacker: EntityGraphics, target: EntityGraphics, clashes: NeoClashResult[]): Promise<void> {
        this.logger.debug("Animating clashes", clashes, "BattleClient");
        for (const clash of clashes) {
            const [promise, resolver] = promiseWrapper(this.OneClash(attacker, target, clash, clash.clashKills));
            this.queueAnimation({
                promise,
                promise_resolve: resolver,
                timeout: 5,
            });
            await this.waitForAllAnimationsToEnd();
        }
    }

    private async OneClash(attacker: EntityGraphics, target: EntityGraphics, clash: NeoClashResult, clashKills = false): Promise<void> {
        if (!attacker || !target) {
            this.logger.warn(`[playAttackAnimation] ${!attacker ? "Attacker" : ""} ${!target ? "Target" : ""} not found`);
            return;
        }
        const targetAnimationHandler = target.animationHandler;
        await target.faceEntity(attacker);
        const attackAnimation = attacker.playAnimation(
            AnimationType.Attack,
            {
                animation: 'swing',
                priority: Enum.AnimationPriority.Action4,
                loop: false,
            });
        const defendIdleAnimation = target.playAnimation(
            AnimationType.Defend,
            {
                animation: "defend",
                priority: Enum.AnimationPriority.Action2,
                loop: false,
            });

        if (!attackAnimation) {
            this.logger.warn("[playAttackAnimation] Attacker animation track not found.");
            // return;
        }

        try {
            // 1. Wait for the attack animation to reach the "Hit" marker.
            if (attackAnimation) await this.waitForAnimationMarker(attackAnimation, "Hit");            // 2. Show combat effects for the attack outcome
            const combatEffects = CombatEffectsService.getInstance();
            const targetHead = target.model.FindFirstChild("Head");
            const targetHeadPos =
                targetHead && targetHead.IsA("BasePart") ? targetHead.Position :
                    target.model.PrimaryPart ? target.model.PrimaryPart.Position : undefined;



            if (targetHeadPos) {
                const screenPos = this.worldToScreenPosition(targetHeadPos);


                // Show impact effect
                const impactSize = clash.result.fate === "CRIT" ? 50 : 30;
                combatEffects.showHitImpact(screenPos, new Color3(1, 0, 0), impactSize);

                // Show damage indicator if the attack hit
                if (clash.result.damage && clash.result.fate !== "Miss" && clash.result.fate !== "Cling") {
                    const damage = clash.result.damage;

                    // Show critical hit effect if applicable
                    if (clash.result.fate === "CRIT") {
                        combatEffects.showAbilityReaction(
                            new UDim2(screenPos.X.Scale, screenPos.X.Offset, screenPos.Y.Scale, screenPos.Y.Offset - 30),
                            new Color3(1, 0.8, 0),
                            "CRITICAL!"
                        );
                    }

                    task.delay(.5, () => {
                        combatEffects.showDamage(screenPos, damage);
                    })
                } else {
                    // Show miss text
                    combatEffects.showAbilityReaction(screenPos, new Color3(0.7, 0.7, 0.7), clash.result.fate);
                }
            }

            // 3. Play the appropriate animation based on the outcome of the attack.
            targetAnimationHandler.killAnimation(AnimationType.Idle);
            targetAnimationHandler.killAnimation(AnimationType.Defend);

            if (clashKills) {
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
                        animation: "defend-hit",
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
        catch (error) {
            this.logger.error(`[playAttackAnimation] Error during attack animation: ${error}`);
        }

        attacker.playAudio(EntityStatus.Idle);
    }

    private worldToScreenPosition(worldPos: Vector3): UDim2 {
        const camera = game.Workspace.CurrentCamera;
        if (!camera) return new UDim2(0.5, 0, 0.5, 0);

        const [screenPos, isVisible] = camera.WorldToScreenPoint(worldPos);
        return new UDim2(0, screenPos.X, 0, screenPos.Y);
    }

    private async waitForAnimationMarker(track: AnimationTrack, markerName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = track.GetMarkerReachedSignal(markerName).Once(() => {
                resolve();
            });

            wait(5);
            if (connection.Connected) {
                connection.Disconnect();
                reject();
            }
        });
    }

    private async waitForAnimationEnd(track?: AnimationTrack): Promise<void> {
        this.logger.debug("TRACK", track?.Name, "Waiting end", track);
        if (!track) return;
        return new Promise((resolve) => {
            track.Ended.Once(() => {
                this.logger.debug("TRACK", track?.Name, "Animation ended", track);
                resolve();
            });
        });
    }
}