import { EntityChangeable } from "../../../State/Entity/types";
import { TriggerModify } from "../../CombatSystem/types";
import StatusEffect from "../StatusEffect";
import {
    StackingRule,
    StatusEffectCategory,
    StatusEffectConfig,
    StatusEffectContext,
    StatusEffectInstance,
    StatusEffectModifier,
    StatusEffectType
} from "../types";

export class TriggerModifyBuffEffect extends StatusEffect {
    constructor(triggerModify: TriggerModify, duration: number = 3.0) {
        const modifier: StatusEffectModifier = {
            type: "stat",
            target: triggerModify.mod,
            operation: "add",
            value: triggerModify.value
        };

        const config: StatusEffectConfig = {
            id: `trigger_modify_${triggerModify.mod}_${triggerModify.value}`,
            name: `${string.upper(triggerModify.mod)} ${triggerModify.value > 0 ? 'Boost' : 'Drain'}`,
            description: `${triggerModify.value > 0 ? 'Increases' : 'Decreases'} ${string.upper(triggerModify.mod)} by ${math.abs(triggerModify.value)}`,
            type: triggerModify.value > 0 ? StatusEffectType.Buff : StatusEffectType.Debuff,
            category: StatusEffectCategory.Combat,
            stackingRule: StackingRule.Stack,
            maxStacks: 5,
            duration,
            priority: 100,
            modifiers: [modifier],
            triggers: [],
            visualEffect: {
                color: triggerModify.value > 0 ? new Color3(0, 1, 0) : new Color3(1, 0.5, 0),
                particle: triggerModify.value > 0 ? "buff_sparkle" : "debuff_drain"
            }
        };

        super(config);
    }

    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const statName = this.config.modifiers[0].target;
        const value = this.config.modifiers[0].value as number;

        this.logger.info(`Applied ${this.config.name}: ${statName} ${value > 0 ? '+' : ''}${value} for ${instance.remainingDuration}s`);
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const statName = this.config.modifiers[0].target;

        this.logger.info(`Removed ${this.config.name}: ${statName} effect expired`);
    }

    protected async onUpdate(context: StatusEffectContext, instance: StatusEffectInstance, deltaTime: number): Promise<void> {
        // No special update logic needed for simple stat modifications
    }
}

export class TriggerModifyDebuffEffect extends StatusEffect {
    constructor(triggerModify: TriggerModify, duration: number = 2.0) {
        const modifier: StatusEffectModifier = {
            type: "stat",
            target: triggerModify.mod,
            operation: "add",
            value: -math.abs(triggerModify.value)
        };

        const config: StatusEffectConfig = {
            id: `trigger_modify_debuff_${triggerModify.mod}_${math.abs(triggerModify.value)}`,
            name: `${string.upper(triggerModify.mod)} Drain`,
            description: `Decreases ${triggerModify.mod} by ${math.abs(triggerModify.value)}`,
            type: StatusEffectType.Debuff,
            category: StatusEffectCategory.Combat,
            stackingRule: StackingRule.Stack,
            maxStacks: 3,
            duration,
            priority: 90,
            modifiers: [modifier],
            triggers: [],
            visualEffect: {
                color: new Color3(0.8, 0.2, 0.2),
                particle: "drain_effect"
            }
        };

        super(config);
    }

    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const statName = this.config.modifiers[0].target;
        const value = this.config.modifiers[0].value as number;

        this.logger.info(`Applied debuff: ${statName} ${value} for ${instance.remainingDuration}s`);
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const statName = this.config.modifiers[0].target;

        this.logger.info(`Removed debuff: ${statName} effect expired`);
    }

    protected async onUpdate(context: StatusEffectContext, instance: StatusEffectInstance, deltaTime: number): Promise<void> {
        // No special update logic needed
    }
}

export function createTriggerModifyEffect(triggerModify: TriggerModify, duration?: number): StatusEffect {
    if (triggerModify.value > 0) {
        return new TriggerModifyBuffEffect(triggerModify, duration);
    } else {
        return new TriggerModifyDebuffEffect(triggerModify, duration);
    }
}

export function getEffectNameForTriggerModify(mod: EntityChangeable): string {
    const nameMap: Record<EntityChangeable, string> = {
        hip: "Health",
        pos: "Position",
        org: "Organization",
        sta: "Stamina",
        mana: "Mana"
    };

    return nameMap[mod] || string.upper(mod);
}
