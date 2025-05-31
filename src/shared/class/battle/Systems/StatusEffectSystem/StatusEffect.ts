import Logger from "shared/utils/Logger";
import { EntityStats } from "../../State/Entity/types";
import { DamageType } from "../CombatSystem/Ability/types";
import {
    EffectTrigger,
    StackingRule,
    StatusEffectConfig,
    StatusEffectContext,
    StatusEffectInstance,
    StatusEffectModification
} from "./types";

export default abstract class StatusEffect {
    protected logger;;
    public readonly config: StatusEffectConfig;

    constructor(config: StatusEffectConfig) {
        this.config = config;
        this.validateConfig();
        this.logger = Logger.createContextLogger(`StatusEffect:${this.config.id}`);
    }

    private validateConfig(): void {
        if (!this.config.id || this.config.id === "") {
            throw "StatusEffect must have a valid ID";
        }
        if (!this.config.name || this.config.name === "") {
            throw "StatusEffect must have a valid name";
        }
        if (this.config.priority < 0) {
            throw "StatusEffect priority must be non-negative";
        }
    }

    public canApply(context: StatusEffectContext): boolean {
        if (this.config.canApply) {
            return this.config.canApply(context);
        }
        return true;
    }

    public shouldRemove(instance: StatusEffectInstance): boolean {
        const context: StatusEffectContext = {
            target: instance.target,
            caster: instance.caster,
            source: instance.effectId
        };

        if (this.config.shouldRemove) {
            return this.config.shouldRemove(context);
        }

        if (instance.remainingDuration !== undefined && instance.remainingDuration <= 0) {
            return true;
        }

        return false;
    }

    public async apply(context: StatusEffectContext): Promise<StatusEffectInstance> {
        this.logger.debug(`Applying effect ${this.config.name} to ${context.target.name}`);

        const instance: StatusEffectInstance = {
            id: this.generateInstanceId(),
            effectId: this.config.id,
            config: this.config,
            target: context.target,
            caster: context.caster,
            stacks: 1,
            remainingDuration: this.config.duration,
            appliedAt: tick(),
            lastUpdated: tick(),
            isActive: true,
            metadata: {}
        };

        await this.onApply(context, instance);

        if (this.config.onApply) {
            await this.config.onApply(context);
        }

        this.executeTriggers(EffectTrigger.OnApply, context);

        return instance;
    }

    public async remove(instance: StatusEffectInstance): Promise<void> {
        this.logger.debug(`Removing effect ${this.config.name} from ${instance.target.name}`);

        const context: StatusEffectContext = {
            target: instance.target,
            caster: instance.caster,
            source: instance.effectId
        };

        instance.isActive = false;

        await this.onRemove(context, instance);

        if (this.config.onRemove) {
            await this.config.onRemove(context);
        }

        this.executeTriggers(EffectTrigger.OnRemove, context);
    }

    public async update(instance: StatusEffectInstance, deltaTime: number): Promise<void> {
        if (!instance.isActive) return;

        instance.lastUpdated = tick();

        if (instance.remainingDuration !== undefined) {
            instance.remainingDuration -= deltaTime;
        }

        const context: StatusEffectContext = {
            target: instance.target,
            caster: instance.caster,
            source: instance.effectId
        };

        await this.onUpdate(context, instance, deltaTime);

        if (this.config.onUpdate) {
            await this.config.onUpdate(context, deltaTime);
        }
    }

    public stack(existingInstance: StatusEffectInstance, newContext: StatusEffectContext): StatusEffectInstance {
        switch (this.config.stackingRule) {
            case StackingRule.None:
                return existingInstance;

            case StackingRule.Replace:
                existingInstance.stacks = 1;
                existingInstance.remainingDuration = this.config.duration;
                existingInstance.caster = newContext.caster;
                break;

            case StackingRule.Stack:
                if (this.config.maxStacks && existingInstance.stacks >= this.config.maxStacks) {
                    return existingInstance;
                }
                existingInstance.stacks++;
                break;

            case StackingRule.Refresh:
                existingInstance.remainingDuration = this.config.duration;
                existingInstance.caster = newContext.caster;
                break;

            case StackingRule.Unique:
                if (existingInstance.caster === newContext.caster) {
                    existingInstance.remainingDuration = this.config.duration;
                }
                break;
        }

        return existingInstance;
    }

    public getModifications(instance: StatusEffectInstance): StatusEffectModification {
        const modifications: StatusEffectModification = {
            statModifiers: new Map(),
            damageModifiers: new Map(),
            potencyModifiers: new Map(),
            passiveEffectModifiers: new Map(),
            customModifiers: new Map()
        };

        const context: StatusEffectContext = {
            target: instance.target,
            caster: instance.caster,
            source: instance.effectId
        };

        for (const modifier of this.config.modifiers) {
            if (modifier.condition && !modifier.condition(context)) {
                continue;
            }

            const value = typeIs(modifier.value, "function")
                ? modifier.value(context) * instance.stacks
                : modifier.value * instance.stacks;

            switch (modifier.type) {
                case "stat":
                    const statKey = modifier.target as keyof EntityStats;
                    modifications.statModifiers.set(statKey, value);
                    break;
                case "damage":
                    const damageKey = modifier.target as DamageType;
                    modifications.damageModifiers.set(damageKey, value);
                    break;
                case "custom":
                    modifications.customModifiers.set(modifier.target, value);
                    break;
            }
        }

        return modifications;
    }

    public executeTriggers(trigger: EffectTrigger, context: StatusEffectContext): void {
        const triggerHandlers = this.config.triggers.filter(t => t.trigger === trigger);

        for (const triggerHandler of triggerHandlers) {
            if (triggerHandler.condition && !triggerHandler.condition(context)) {
                continue;
            }

            try {
                triggerHandler.handler(context);
            } catch (error) {
                this.logger.error(`Error executing trigger ${trigger}:`, error as defined);
            }
        }
    }

    protected abstract onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void>;
    protected abstract onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void>;
    protected abstract onUpdate(context: StatusEffectContext, instance: StatusEffectInstance, deltaTime: number): Promise<void>;

    private generateInstanceId(): string {
        return `${this.config.id}_${tick()}_${math.random()}`;
    }
}
