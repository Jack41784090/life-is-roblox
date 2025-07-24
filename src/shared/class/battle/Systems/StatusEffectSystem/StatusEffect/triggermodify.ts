import StatusEffect from ".";
import { TriggerModify } from "../../CombatSystem/types";
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
    constructor(triggerModify: TriggerModify, duration: number = 3) {
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

        this.logger.info(`Applied ${this.config.name}: ${statName} ${value > 0 ? '+' : ''}${value} for ${instance.remainingTurns} turns`);
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const statName = this.config.modifiers[0].target;

        this.logger.info(`Removed ${this.config.name}: ${statName} effect expired`);
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // No special turn update logic needed for simple stat modifications
    }
}
