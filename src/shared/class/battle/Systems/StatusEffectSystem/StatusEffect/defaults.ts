import { calculateRealityValue } from "shared/utils";
import StatusEffect from ".";
import { Reality } from "../../CombatSystem/types";
import { EntityInterface, StatusEffectContext, StatusEffectInstance } from "../types";

export class BuffEffect extends StatusEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default buff application logic
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default buff removal logic
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default buff turn update logic
    }
}

export class DebuffEffect extends StatusEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default debuff application logic
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default debuff removal logic
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Default debuff turn update logic
    }
}

export class DamageOverTimeEffect extends StatusEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.totalDamageDealt = 0;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Log total damage dealt for analytics
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const damage = this.calculateDamage(instance);
        this.dealDamage(context.target, damage, context.caster);

        instance.metadata.totalDamageDealt = (instance.metadata.totalDamageDealt as number || 0) + damage;
    }

    private calculateDamage(instance: StatusEffectInstance): number {
        const baseDamage = instance.metadata.baseDamage as number || 10;
        return baseDamage * instance.stacks;
    }

    private dealDamage(target: EntityInterface, damage: number, caster?: EntityInterface): void {
        const currentHealth = target.get('hip');
        target.set('hip', math.max(0, currentHealth - damage));

        // TODO: Integrate with visual effects system
        // TODO: Emit damage events
    }
}

export class HealOverTimeEffect extends StatusEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.totalHealingDone = 0;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Log total healing done for analytics
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const healing = this.calculateHealing(instance);
        this.heal(context.target, healing);

        instance.metadata.totalHealingDone = (instance.metadata.totalHealingDone as number || 0) + healing;
    }

    private calculateHealing(instance: StatusEffectInstance): number {
        const baseHealing = instance.metadata.baseHealing as number || 5;
        return baseHealing * instance.stacks;
    }

    private heal(target: EntityInterface, healing: number): void {
        const currentHealth = target.get('hip');
        const maxHealth = calculateRealityValue(Reality.HP, target.stats)
        target.set('hip', math.min(maxHealth, currentHealth + healing));

        // TODO: Integrate with visual effects system
        // TODO: Emit healing events
    }
}

export class ShieldEffect extends StatusEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const shieldAmount = this.calculateShieldAmount(instance);
        instance.metadata.currentShield = shieldAmount;
        instance.metadata.maxShield = shieldAmount;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.currentShield = 0;
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Check if shield is depleted
        const currentShield = instance.metadata.currentShield as number || 0;
        if (currentShield <= 0) {
            instance.remainingTurns = 0; // Mark for removal
        }
    }

    private calculateShieldAmount(instance: StatusEffectInstance): number {
        const baseShield = instance.metadata.baseShield as number || 20;
        return baseShield * instance.stacks;
    }

    public absorbDamage(instance: StatusEffectInstance, incomingDamage: number): number {
        const currentShield = instance.metadata.currentShield as number || 0;
        const damageAbsorbed = math.min(currentShield, incomingDamage);

        instance.metadata.currentShield = currentShield - damageAbsorbed;

        return incomingDamage - damageAbsorbed;
    }
}
