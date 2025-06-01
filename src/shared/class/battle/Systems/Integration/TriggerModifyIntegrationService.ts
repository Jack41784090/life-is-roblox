import Logger from "shared/utils/Logger";
import State from "../../State";
import Entity from "../../State/Entity";
import { TriggerModify } from "../CombatSystem/types";
import StatusEffectSystem from "../StatusEffectSystem";
import { createTriggerModifyEffect } from "../StatusEffectSystem/Effects/TriggerModifyEffects";
import { StatusEffectContext } from "../StatusEffectSystem/types";

export interface TriggerModifyApplicationConfig {
    duration?: number;
    source?: string;
    stackable?: boolean;
    immediateApplication?: boolean;
}

export default class TriggerModifyIntegrationService {
    private logger = Logger.createContextLogger("TriggerModifyIntegration");
    private gameState: State;
    private statusEffectSystem: StatusEffectSystem;

    constructor(gameState: State, statusEffectSystem: StatusEffectSystem) {
        this.gameState = gameState;
        this.statusEffectSystem = statusEffectSystem;
    }

    public async applyTriggerModify(
        triggerModify: TriggerModify,
        targetEntityId: number,
        casterEntityId?: number,
        config: TriggerModifyApplicationConfig = {}
    ): Promise<boolean> {
        const target = this.gameState.getEntityManager().getEntity(targetEntityId);
        const caster = casterEntityId ? this.gameState.getEntityManager().getEntity(casterEntityId) : undefined;

        if (!target) {
            this.logger.warn(`Target entity ${targetEntityId} not found for TriggerModify application`);
            return false;
        }

        const duration = config.duration || this.getDefaultDuration(triggerModify);
        const effect = createTriggerModifyEffect(triggerModify, duration);

        this.statusEffectSystem.registerGlobalEffect(effect);

        const context: StatusEffectContext = {
            target,
            caster,
            source: config.source || "trigger_modify",
            triggerData: {
                originalTriggerModify: triggerModify,
                immediateApplication: config.immediateApplication || false
            }
        };

        const success = await this.statusEffectSystem.applyEffect(
            targetEntityId,
            effect.config.id,
            caster,
            1,
            config.source
        );

        if (success) {
            this.logger.info(`Applied TriggerModify effect: ${triggerModify.mod} ${triggerModify.value > 0 ? '+' : ''}${triggerModify.value} to entity ${target.name}`);

            if (config.immediateApplication) {
                await this.applyImmediateStatChange(triggerModify, target);
            }
        }

        return success;
    }

    public async applyMultipleTriggerModifies(
        triggerModifies: TriggerModify[],
        targetEntityId: number,
        casterEntityId?: number,
        config: TriggerModifyApplicationConfig = {}
    ): Promise<boolean> {
        let allSuccessful = true;

        for (const triggerModify of triggerModifies) {
            const success = await this.applyTriggerModify(
                triggerModify,
                targetEntityId,
                casterEntityId,
                config
            );

            if (!success) {
                allSuccessful = false;
            }
        }

        return allSuccessful;
    }

    public hasActiveTriggerModifyEffect(
        entityId: number,
        triggerModify: TriggerModify,
        casterEntityId?: number
    ): boolean {
        const effect = createTriggerModifyEffect(triggerModify);
        const caster = casterEntityId ? this.gameState.getEntityManager().getEntity(casterEntityId) : undefined;

        return this.statusEffectSystem.hasEffect(entityId, effect.config.id, caster);
    }

    public getActiveTriggerModifyStacks(
        entityId: number,
        triggerModify: TriggerModify,
        casterEntityId?: number
    ): number {
        const effect = createTriggerModifyEffect(triggerModify);
        const caster = casterEntityId ? this.gameState.getEntityManager().getEntity(casterEntityId) : undefined;

        return this.statusEffectSystem.getEffectStacks(entityId, effect.config.id, caster);
    }

    public async removeTriggerModifyEffect(
        entityId: number,
        triggerModify: TriggerModify,
        casterEntityId?: number
    ): Promise<number> {
        const effect = createTriggerModifyEffect(triggerModify);
        const caster = casterEntityId ? this.gameState.getEntityManager().getEntity(casterEntityId) : undefined;

        return await this.statusEffectSystem.removeEffect(entityId, effect.config.id, caster);
    }

    private getDefaultDuration(triggerModify: TriggerModify): number {
        const baseDuration = 3.0;
        const magnitude = math.abs(triggerModify.value);

        if (magnitude >= 10) return baseDuration * 1.5;
        if (magnitude >= 5) return baseDuration * 1.2;
        if (magnitude <= 2) return baseDuration * 0.8;

        return baseDuration;
    }

    private async applyImmediateStatChange(triggerModify: TriggerModify, target: Entity): Promise<void> {
        const property = triggerModify.mod;

        // Check if it's an EntityChangeable property (atoms)
        if (property === 'pos' || property === 'hip' || property === 'org' || property === 'sta' || property === 'mana') {
            const currentValue = target.get(property);
            const newValue = currentValue + triggerModify.value;
            target.set(property, math.max(0, newValue));
            this.logger.debug(`Immediate stat change: ${target.name} ${property} ${currentValue} → ${newValue}`);
        }
        // Check if it's an EntityStats property
        else if (property === 'str' || property === 'dex' || property === 'acr' || property === 'spd' ||
            property === 'siz' || property === 'int' || property === 'spr' || property === 'fai' ||
            property === 'cha' || property === 'beu' || property === 'wil' || property === 'end') {
            const currentValue = target.get(property);
            const newValue = currentValue + triggerModify.value;
            target.set(property, math.max(0, newValue));
            this.logger.debug(`Immediate stat change: ${target.name} ${property} ${currentValue} → ${newValue}`);
        }
        else {
            this.logger.warn(`Unknown property in TriggerModify: ${property}`);
        }
    }

    public getTriggerModifyEffectsByEntity(entityId: number): Array<{
        effect: string;
        stacks: number;
        mod: string;
        value: number;
        isPositive: boolean;
    }> {
        const manager = this.statusEffectSystem.getEntityManager(entityId);
        if (!manager) return [];

        const effects = manager.getActiveEffects();
        const triggerModifyEffects = effects.filter(effect =>
            effect.effectId.find('trigger_modify_')[0] === 1
        );

        return triggerModifyEffects.map(effect => {
            const parts = effect.effectId.split('_');
            const mod = parts[2];
            const value = tonumber(parts[3]) || 0;

            return {
                effect: effect.effectId,
                stacks: effect.stacks,
                mod,
                value,
                isPositive: value > 0
            };
        });
    }
}
