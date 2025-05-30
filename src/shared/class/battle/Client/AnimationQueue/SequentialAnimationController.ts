import Logger from "shared/utils/Logger";
import EntityGraphics from "../../State/Entity/Graphics";
import { AnimationType } from "../../State/Entity/Graphics/AnimationHandler";
import { NeoClashResult } from "../../Systems/CombatSystem/types";
import CombatEffectsService from "../Effects/CombatEffectsServices";

export interface AnimationSequenceStep {
    type: "die_reveal" | "hit_impact" | "miss_dodge" | "recovery";
    die: NeoClashResult;
    duration: number;
    pauseBeforeNext?: number;
}

export interface SequentialAnimationConfig {
    attacker: EntityGraphics;
    target: EntityGraphics;
    dice: NeoClashResult[];
    pauseDuration: number;
}

export default class SequentialAnimationController {
    private currentSwingAnim?: AnimationTrack;
    private currentDefendAnim?: AnimationTrack;
    private logger = Logger.createContextLogger("SequentialAnimation");
    private isPlaying = false;
    private currentStep = 0;
    private animationSteps: AnimationSequenceStep[] = [];

    constructor(private config: SequentialAnimationConfig) {
        this.buildAnimationSequence();
    }

    private buildAnimationSequence(): void {
        this.animationSteps = [];

        for (const die of this.config.dice) {
            const step: AnimationSequenceStep = {
                type: this.determineStepType(die),
                die,
                duration: this.calculateStepDuration(die),
                pauseBeforeNext: this.config.pauseDuration
            };
            this.animationSteps.push(step);
        }

        this.animationSteps.push({
            type: "recovery",
            die: this.config.dice[this.config.dice.size() - 1],
            duration: 1.0,
            pauseBeforeNext: 0 // No pause after recovery
        })
    }

    private determineStepType(die: NeoClashResult): AnimationSequenceStep["type"] {
        switch (die.result.fate) {
            case "Miss":
                return "miss_dodge";
            case "Hit":
            case "CRIT":
                return die.result.against === "DV" ? "die_reveal" : "hit_impact";
            case "Cling":
                return "die_reveal";
            default:
                return "die_reveal";
        }
    }

    private calculateStepDuration(die: NeoClashResult): number {
        const baseDuration = 1.0;

        switch (die.result.fate) {
            case "CRIT":
                return baseDuration * 1.8;
            case "Hit":
                return baseDuration * 1.4;
            case "Miss":
                return baseDuration * 0.8;
            case "Cling":
                return baseDuration * 1.1;
            default:
                return baseDuration;
        }
    }

    private calculateHitStunDuration(die: NeoClashResult): number {
        if (die.result.fate === "Miss" || die.result.fate === "Cling") {
            return 0;
        }

        const baseDuration = 0.5;
        const damage = die.result.damage || 0;
        const impact = die.result.fate === "CRIT" ? 2.0 : 1.0;

        return baseDuration + (damage * 0.1) + (impact * 0.3);
    }

    public async playSequence(): Promise<void> {
        if (this.isPlaying) {
            this.logger.warn("Animation sequence already playing");
            return;
        }

        this.isPlaying = true;
        this.currentStep = 0;

        try {
            await this.prepareCombatants();

            for (const step of this.animationSteps) {
                await this.executeStep(step);

                if (step.pauseBeforeNext && step.pauseBeforeNext > 0) {
                    await this.pauseWithRollReveal(step);
                }

                this.currentStep++;
            }

            await this.concludeSequence();
        } finally {
            this.isPlaying = false;
        }
    }

    private async prepareCombatants(): Promise<void> {
        const { attacker, target } = this.config;

        await target.faceEntity(attacker);
        this.currentSwingAnim = attacker.playAnimation(AnimationType.Attack, {
            animation: "swing",
            priority: Enum.AnimationPriority.Action2,
            loop: false,
        })
        if (this.currentSwingAnim) {
            await this.waitForAnimationMarker(this.currentSwingAnim, "Hit")
                .then(() => {
                    this.logger.info("Hit marker reached during preparation");
                    this.currentSwingAnim!.AdjustSpeed(0);
                })
                .catch(() => {
                    this.logger.warn("Hit marker timeout during preparation");
                });
        }

        // target.playAnimation(AnimationType.Defend, {
        //     animation: "defend",
        //     priority: Enum.AnimationPriority.Action2,
        //     loop: false,
        // });
    }

    private async executeStep(step: AnimationSequenceStep): Promise<void> {
        const { attacker, target } = this.config;

        switch (step.type) {
            case "miss_dodge":
                await this.executeMissSequence(step);
                break;
            case "die_reveal":
                await this.executeDieRevealSequence(step);
                break;
            case "hit_impact":
                await this.executeHitImpactSequence(step);
                break;
            case "recovery":
                await this.executeRecoverySequence(step);
                break;
        }
    }

    private async executeMissSequence(step: AnimationSequenceStep): Promise<void> {
        const { attacker, target } = this.config;

        this.showRollEffects(step.die);

        this.currentSwingAnim?.AdjustSpeed(0.8);

        target.playAnimation(AnimationType.Defend, {
            animation: "dodge",
            priority: Enum.AnimationPriority.Action3,
            loop: false,
        });

        await this.wait(step.duration);
    }

    private async executeDieRevealSequence(step: AnimationSequenceStep): Promise<void> {
        this.showRollEffects(step.die);
        await this.wait(step.duration);
    }

    private async executeHitImpactSequence(step: AnimationSequenceStep): Promise<void> {
        const { attacker, target } = this.config;

        if (!this.currentDefendAnim) {
            const defendAnimation = target.playAnimation(AnimationType.Defend, {
                animation: "defend",
                priority: Enum.AnimationPriority.Action2,
                loop: false,
            });

            this.currentDefendAnim = target.playAnimation(AnimationType.Idle, {
                animation: "defend-idle",
                priority: Enum.AnimationPriority.Idle,
                loop: true,
            });

            await this.waitForAnimationEnd(defendAnimation);
        }

        this.currentSwingAnim?.AdjustSpeed(0);

        this.showRollEffects(step.die);
        this.showHitStunEffects(step.die);

        const hitStunDuration = this.calculateHitStunDuration(step.die);
        await this.wait(hitStunDuration);

        this.currentSwingAnim?.AdjustSpeed(1);

        const hitAnimation = target.playAnimation(AnimationType.Hit, {
            animation: 'defend-hit',
            priority: Enum.AnimationPriority.Action3,
            loop: false,
        });

        await this.waitForAnimationEnd(hitAnimation);
    }

    private async executeRecoverySequence(step: AnimationSequenceStep): Promise<void> {
        const { attacker, target } = this.config;

        attacker.playAnimation(AnimationType.Idle, {
            animation: "idle",
            priority: Enum.AnimationPriority.Idle,
            loop: true,
        });

        target.playAnimation(AnimationType.Idle, {
            animation: "idle",
            priority: Enum.AnimationPriority.Idle,
            loop: true,
        });

        if (this.currentDefendAnim) {
            const transitionTrack = target.playAnimation(AnimationType.Transition, {
                animation: "defend->idle",
                priority: Enum.AnimationPriority.Action4,
                loop: false,
            });
            await this.waitForAnimationEnd(transitionTrack);
        }

        // if (this.currentDefendAnim) {
        //     target.animationHandler.killAnimation(AnimationType.Defend);
        // }
    }

    private async pauseWithRollReveal(step: AnimationSequenceStep): Promise<void> {
        const combatEffects = CombatEffectsService.getInstance();
        const { target } = this.config;

        const targetHead = target.model.FindFirstChild("Head");
        const targetPos = targetHead && targetHead.IsA("BasePart") ?
            targetHead.Position :
            target.model.PrimaryPart?.Position;

        if (targetPos) {
            const screenPos = this.worldToScreenPosition(targetPos);

            combatEffects.showDetailedHitAnalysis(screenPos, {
                roll: step.die.result.roll,
                target: step.die.result.toSurmount,
                die: step.die.result.die,
                bonus: step.die.result.bonus,
                checkType: step.die.result.against,
                fate: step.die.result.fate,
                damage: step.die.result.damage,
                weaponName: "Weapon",
                armourName: "Armour"
            });
        }

        await this.wait(step.pauseBeforeNext || this.config.pauseDuration);
    }

    private showRollEffects(die: NeoClashResult): void {
        const combatEffects = CombatEffectsService.getInstance();
        const { attacker, target } = this.config;

        const attackerHead = attacker.model.FindFirstChild("Head");
        const targetHead = target.model.FindFirstChild("Head");

        const attackerPos = attackerHead && attackerHead.IsA("BasePart") ?
            attackerHead.Position : attacker.model.PrimaryPart?.Position;
        const targetPos = targetHead && targetHead.IsA("BasePart") ?
            targetHead.Position : target.model.PrimaryPart?.Position;

        if (attackerPos) {
            const screenPos = this.worldToScreenPosition(attackerPos);
            combatEffects.showAbilityReaction(
                new UDim2(screenPos.X.Scale, screenPos.X.Offset, screenPos.Y.Scale, screenPos.Y.Offset - 30),
                new Color3(1, 0.2, 0),
                `🎲${die.result.roll + die.result.bonus}`
            );
        }

        if (targetPos) {
            const screenPos = this.worldToScreenPosition(targetPos);
            combatEffects.showAbilityReaction(
                new UDim2(screenPos.X.Scale, screenPos.X.Offset, screenPos.Y.Scale, screenPos.Y.Offset - 30),
                new Color3(0, 0.2, 1),
                `${die.result.against === 'DV' ? '🏃‍♂️' : '🛡️'} ${die.result.toSurmount}`
            );
        }
    }

    private showHitStunEffects(die: NeoClashResult): void {
        if (die.result.fate === "Miss" || die.result.fate === "Cling") return;

        const combatEffects = CombatEffectsService.getInstance();
        const { target } = this.config;

        const targetHead = target.model.FindFirstChild("Head");
        const targetPos = targetHead && targetHead.IsA("BasePart") ?
            targetHead.Position : target.model.PrimaryPart?.Position;

        if (targetPos) {
            const screenPos = this.worldToScreenPosition(targetPos);
            const impactSize = die.result.fate === "CRIT" ? 60 : 40;

            combatEffects.showHitImpact(screenPos, new Color3(1, 0, 0), impactSize);

            if (die.result.damage && die.result.damage > 0) {
                if (die.result.fate === "CRIT") {
                    combatEffects.showAbilityReaction(screenPos, new Color3(1, 0.8, 0), "CRITICAL!");
                }

                task.delay(0.5, () => {
                    combatEffects.showDamage(screenPos, die.result.damage!);
                });
            }
        }
    }

    private async concludeSequence(): Promise<void> {
        const { attacker } = this.config;
        attacker.playAudio("Idle" as any);
    }

    private worldToScreenPosition(worldPos: Vector3): UDim2 {
        const camera = game.Workspace.CurrentCamera;
        if (!camera) return new UDim2(0.5, 0, 0.5, 0);

        const [screenPos] = camera.WorldToScreenPoint(worldPos);
        return new UDim2(0, screenPos.X, 0, screenPos.Y);
    }

    private async waitForAnimationMarker(track: AnimationTrack, markerName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = track.GetMarkerReachedSignal(markerName).Once(() => {
                resolve();
            });

            task.delay(5, () => {
                if (connection.Connected) {
                    connection.Disconnect();
                    reject("Animation marker timeout");
                }
            });
        });
    }

    private async waitForAnimationEnd(track?: AnimationTrack): Promise<void> {
        if (!track) return;

        return new Promise((resolve) => {
            track.Ended.Once(() => {
                resolve();
            });
        });
    }

    private wait(duration: number): Promise<void> {
        return new Promise((resolve) => {
            task.delay(duration, resolve);
        });
    }

    public getCurrentStep(): number {
        return this.currentStep;
    }

    public getTotalSteps(): number {
        return this.animationSteps.size();
    }

    public isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }
}
