import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import StatusEffect from "./StatusEffect";
import {
    EffectTrigger,
    EntityInterface,
    StatusEffectContext,
    StatusEffectEventData,
    StatusEffectInstance,
    StatusEffectModification,
    StatusEffectSystemConfig
} from "./types";

export default class StatusEffectManager {
    private logger = Logger.createContextLogger("StatusEffectManager");
    private entity: EntityInterface;
    private eventBus: EventBus;
    private activeEffects: Map<string, StatusEffectInstance> = new Map();
    private effectRegistry: Map<string, StatusEffect> = new Map();
    private config: StatusEffectSystemConfig;

    constructor(entity: EntityInterface, eventBus: EventBus, config: StatusEffectSystemConfig = {}) {
        this.entity = entity;
        this.eventBus = eventBus;
        this.config = {
            maxEffectsPerEntity: 20,
            updateInterval: 0.1,
            enableVisualEffects: true,
            debugMode: false,
            ...config
        };
        this.setupEventListeners();
    }

    public registerEffect(effect: StatusEffect): void {
        this.effectRegistry.set(effect.config.id, effect);
        this.logger.debug(`Registered effect: ${effect.config.name}`);
    }

    public async applyEffect(effectId: string, context: StatusEffectContext): Promise<boolean> {
        const effect = this.effectRegistry.get(effectId);
        if (!effect) {
            this.logger.warn(`Effect not found: ${effectId}`);
            return false;
        }

        if (!effect.canApply(context)) {
            this.logger.debug(`Effect ${effectId} cannot be applied to ${context.target.name}`);
            return false;
        }

        if (this.activeEffects.size() >= this.config.maxEffectsPerEntity!) {
            this.logger.warn(`Max effects limit reached for ${this.entity.name}`);
            return false;
        }

        const existingEffect = this.findExistingEffect(effectId, context.caster);

        if (existingEffect) {
            const stackedEffect = effect.stack(existingEffect, context);
            this.emitEffectEvent("updated", stackedEffect);
            return true;
        }

        const instance = await effect.apply(context);
        this.activeEffects.set(instance.id, instance);

        this.emitEffectEvent("applied", instance);
        this.logger.debug(`Applied effect ${effect.config.name} to ${this.entity.name}`);

        return true;
    }

    public async removeEffect(instanceId: string): Promise<boolean> {
        const instance = this.activeEffects.get(instanceId);
        if (!instance) {
            return false;
        }

        const effect = this.effectRegistry.get(instance.effectId);
        if (effect) {
            await effect.remove(instance);
        }

        this.activeEffects.delete(instanceId);
        this.emitEffectEvent("removed", instance);

        return true;
    }

    public async removeEffectsByType(effectId: string, caster?: EntityInterface): Promise<number> {
        let removedCount = 0;
        const toRemove: string[] = [];

        for (const [instanceId, instance] of this.activeEffects) {
            if (instance.effectId === effectId && (!caster || instance.caster === caster)) {
                toRemove.push(instanceId);
            }
        }

        for (const instanceId of toRemove) {
            if (await this.removeEffect(instanceId)) {
                removedCount++;
            }
        }

        return removedCount;
    }

    public getActiveEffects(): StatusEffectInstance[] {
        const activeEffects: StatusEffectInstance[] = [];
        for (const [_, effect] of this.activeEffects) {
            if (effect.isActive) {
                activeEffects.push(effect);
            }
        }
        return activeEffects;
    }

    public hasEffect(effectId: string, caster?: EntityInterface): boolean {
        for (const [_, instance] of this.activeEffects) {
            if (instance.effectId === effectId && (!caster || instance.caster === caster)) {
                return true;
            }
        }
        return false;
    }

    public getEffectStacks(effectId: string, caster?: EntityInterface): number {
        for (const [_, instance] of this.activeEffects) {
            if (instance.effectId === effectId && (!caster || instance.caster === caster)) {
                return instance.stacks;
            }
        }
        return 0;
    }

    public getComputedModifications(): StatusEffectModification {
        const combined: StatusEffectModification = {
            statModifiers: new Map(),
            damageModifiers: new Map(),
            potencyModifiers: new Map(),
            passiveEffectModifiers: new Map(),
            customModifiers: new Map()
        };

        const effectsArray: StatusEffectInstance[] = [];
        for (const [_, instance] of this.activeEffects) {
            if (instance.isActive) {
                effectsArray.push(instance);
            }
        }
        effectsArray.sort((a, b) => {
            if (a.config.priority < b.config.priority) return true;
            if (a.config.priority > b.config.priority) return false;
            return false;
        });

        for (const instance of effectsArray) {
            const effect = this.effectRegistry.get(instance.effectId);
            if (!effect) continue;

            const modifications = effect.getModifications(instance);

            this.combineModifications(combined.statModifiers, modifications.statModifiers);
            this.combineModifications(combined.damageModifiers, modifications.damageModifiers);
            this.combineModifications(combined.potencyModifiers, modifications.potencyModifiers);
            this.combineModifications(combined.passiveEffectModifiers, modifications.passiveEffectModifiers);
            this.combineModifications(combined.customModifiers, modifications.customModifiers);
        }

        return combined;
    }

    public triggerEffects(trigger: EffectTrigger, triggerData?: Record<string, unknown>): void {
        const context: StatusEffectContext = {
            target: this.entity,
            triggerData
        };

        for (const [_, instance] of this.activeEffects) {
            if (!instance.isActive) continue;

            const effect = this.effectRegistry.get(instance.effectId);
            if (effect) {
                effect.executeTriggers(trigger, context);
            }
        }
    }

    public purgeExpiredEffects(): Promise<void> {
        const expiredEffects: string[] = [];

        for (const [instanceId, instance] of this.activeEffects) {
            const effect = this.effectRegistry.get(instance.effectId);
            if (effect && effect.shouldRemove(instance)) {
                expiredEffects.push(instanceId);
            }
        }

        return Promise.all(expiredEffects.map(id => this.removeEffect(id))).then(() => { });
    }

    public destroy(): void {
        this.activeEffects.clear();
        this.effectRegistry.clear();
    }

    private findExistingEffect(effectId: string, caster?: EntityInterface): StatusEffectInstance | undefined {
        for (const [_, instance] of this.activeEffects) {
            if (instance.effectId === effectId) {
                const effect = this.effectRegistry.get(effectId);
                if (!effect) continue;

                switch (effect.config.stackingRule) {
                    case "unique":
                        if (instance.caster === caster) {
                            return instance;
                        }
                        break;
                    default:
                        return instance;
                }
            }
        }
        return undefined;
    }

    private combineModifications<T>(target: Map<T, number>, source: Map<T, number>): void {
        for (const [key, value] of source) {
            const existingValue = target.get(key) || 0;
            target.set(key, existingValue + value);
        }
    }

    private setupEventListeners(): void {
        this.eventBus.subscribe(GameEvent.TURN_STARTED, (playerId: unknown) => {
            if (this.entity.playerID === playerId) {
                this.triggerEffects(EffectTrigger.OnTurnStart);
                this.updateEffectsOnTurn();
            }
        });

        this.eventBus.subscribe(GameEvent.TURN_ENDED, (playerId: unknown) => {
            if (this.entity.playerID === playerId) {
                this.triggerEffects(EffectTrigger.OnTurnEnd);
            }
        });

        this.eventBus.subscribe(GameEvent.ON_DEAL_DAMAGE, (data: unknown) => {
            this.triggerEffects(EffectTrigger.OnDealDamage, { data });
        });

        this.eventBus.subscribe(GameEvent.ON_TOUCH, (data: unknown) => {
            this.triggerEffects(EffectTrigger.OnTakeDamage, { data });
        });
    }

    private async updateEffectsOnTurn(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [_, instance] of this.activeEffects) {
            if (!instance.isActive) continue;

            const effect = this.effectRegistry.get(instance.effectId);
            if (effect) {
                promises.push(effect.updateOnTurn(instance));
            }
        }

        await Promise.all(promises);
        await this.purgeExpiredEffects();
    }

    private emitEffectEvent(eventType: StatusEffectEventData["eventType"], effect: StatusEffectInstance): void {
        const eventData: StatusEffectEventData = {
            effect,
            entity: this.entity,
            eventType
        };

        this.eventBus.emit(`status_effect:${eventType}`, eventData);

        if (this.config.debugMode) {
            this.logger.debug(`Status effect ${eventType}: ${effect.config.name} on ${this.entity.name}`);
        }
    }
}
