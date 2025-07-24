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

    protected calculateHealing(instance: StatusEffectInstance): number {
        const baseHealing = instance.metadata.baseHealing as number || 5;
        return baseHealing * instance.stacks;
    }

    protected heal(target: EntityInterface, healing: number): void {
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
        const damageAbsorbed = math.max(0, math.min(currentShield, incomingDamage));

        instance.metadata.currentShield = math.max(0, currentShield - damageAbsorbed);

        return incomingDamage - damageAbsorbed;
    }
}

export class BurnEffect extends DamageOverTimeEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        await super.onApply(context, instance);
        instance.metadata.baseDamage = instance.metadata.baseDamage || 8;
        instance.metadata.spreadChance = 0.15;
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        await super.onTurnUpdate(context, instance);

        const spreadChance = instance.metadata.spreadChance as number;
        if (math.random() < spreadChance) {
            this.trySpreadToNearbyEnemies(context, instance);
        }
    }

    private trySpreadToNearbyEnemies(context: StatusEffectContext, instance: StatusEffectInstance): void {
        // TODO: Implement spreading logic to nearby entities
    }
}

export class PoisonEffect extends DamageOverTimeEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        await super.onApply(context, instance);
        instance.metadata.baseDamage = instance.metadata.baseDamage || 5;
        instance.metadata.healingReduction = 0.5;
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        await super.onTurnUpdate(context, instance);

        // Reduce any incoming healing by 50%
        const healingReduction = instance.metadata.healingReduction as number;
        instance.metadata.currentHealingReduction = healingReduction;
    }
}

export class RegenerationEffect extends HealOverTimeEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        await super.onApply(context, instance);
        instance.metadata.baseHealing = instance.metadata.baseHealing || 12;
        instance.metadata.bonusOnLowHealth = true;
    }

    protected calculateHealing(instance: StatusEffectInstance): number {
        const baseHealing = instance.metadata.baseHealing as number || 12;
        let healing = baseHealing * instance.stacks;

        const bonusOnLowHealth = instance.metadata.bonusOnLowHealth as boolean;
        if (bonusOnLowHealth) {
            const currentHealth = instance.target.get('hip');
            const maxHealth = calculateRealityValue(Reality.HP, instance.target.stats);
            const healthPercentage = currentHealth / maxHealth;

            if (healthPercentage < 0.3) {
                healing *= 2;
            }
        }

        return healing;
    }
}

export class HasteEffect extends BuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const speedBonus = instance.metadata.speedBonus as number || 25;
        const currentSpeed = context.target.stats.spd;
        context.target.stats.spd = currentSpeed + (speedBonus * instance.stacks);

        instance.metadata.originalSpeed = currentSpeed;
        instance.metadata.appliedBonus = speedBonus * instance.stacks;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalSpeed = instance.metadata.originalSpeed as number;
        context.target.stats.spd = originalSpeed;
    }
}

export class SlowEffect extends DebuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const speedReduction = instance.metadata.speedReduction as number || 0.5;
        const currentSpeed = context.target.stats.spd;
        const newSpeed = math.max(1, currentSpeed * (1 - speedReduction * instance.stacks));

        context.target.stats.spd = newSpeed;
        instance.metadata.originalSpeed = currentSpeed;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalSpeed = instance.metadata.originalSpeed as number;
        context.target.stats.spd = originalSpeed;
    }
}

export class StrengthEffect extends BuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const damageBonus = instance.metadata.damageBonus as number || 15;
        const currentAttack = context.target.stats.str;
        context.target.stats.str = currentAttack + (damageBonus * instance.stacks);

        instance.metadata.originalAttack = currentAttack;
        instance.metadata.appliedBonus = damageBonus * instance.stacks;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalAttack = instance.metadata.originalAttack as number;
        context.target.stats.str = originalAttack;
    }
}

export class WeaknessEffect extends DebuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const damageReduction = instance.metadata.damageReduction as number || 0.3;
        const currentAttack = context.target.stats.str;
        const newAttack = math.max(1, currentAttack * (1 - damageReduction * instance.stacks));

        context.target.stats.str = newAttack;
        instance.metadata.originalAttack = currentAttack;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalAttack = instance.metadata.originalAttack as number;
        context.target.stats.str = originalAttack;
    }
}

export class FortifyEffect extends BuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const defenseBonus = instance.metadata.defenseBonus as number || 20;
        const currentDefense = context.target.stats.end;
        context.target.stats.end = currentDefense + (defenseBonus * instance.stacks);

        instance.metadata.originalDefense = currentDefense;
        instance.metadata.appliedBonus = defenseBonus * instance.stacks;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalDefense = instance.metadata.originalDefense as number;
        context.target.stats.end = originalDefense;
    }
}

export class VulnerabilityEffect extends DebuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const defenseReduction = instance.metadata.defenseReduction as number || 0.4;
        const currentDefense = context.target.stats.end;
        const newDefense = math.max(1, currentDefense * (1 - defenseReduction * instance.stacks));

        context.target.stats.end = newDefense;
        instance.metadata.originalDefense = currentDefense;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalDefense = instance.metadata.originalDefense as number;
        context.target.stats.end = originalDefense;
    }
}

export class StunEffect extends DebuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.canAct = false;
        instance.metadata.canMove = false;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.canAct = true;
        instance.metadata.canMove = true;
    }
}

export class InvisibilityEffect extends BuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.isInvisible = true;
        instance.metadata.dodgeChanceBonus = 0.5;
        instance.metadata.movementCostReduction = 0.3;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        instance.metadata.isInvisible = false;
        instance.metadata.dodgeChanceBonus = 0;
        instance.metadata.movementCostReduction = 0;
    }

    protected async onTurnUpdate(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        // Invisibility breaks when dealing damage
        if (instance.metadata.hasDealtDamage) {
            instance.remainingTurns = 0;
        }
    }
}

export class BerserkEffect extends BuffEffect {
    protected async onApply(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const damageBonus = instance.metadata.damageBonus as number || 40;
        const defenseReduction = instance.metadata.defenseReduction as number || 0.5;

        const currentAttack = context.target.stats.str;
        const currentDefense = context.target.stats.end;

        context.target.stats.str = currentAttack + (damageBonus * instance.stacks);
        context.target.stats.end = math.max(1, currentDefense * (1 - defenseReduction));

        instance.metadata.originalAttack = currentAttack;
        instance.metadata.originalDefense = currentDefense;
    }

    protected async onRemove(context: StatusEffectContext, instance: StatusEffectInstance): Promise<void> {
        const originalAttack = instance.metadata.originalAttack as number;
        const originalDefense = instance.metadata.originalDefense as number;

        context.target.stats.str = originalAttack;
        context.target.stats.end = originalDefense;
    }
} 
