import { extractMapValues } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus } from "../../Events/EventBus";
import State from "../../State";
import Entity from "../../State/Entity";
import StatusEffect from "./StatusEffect";
import StatusEffectManager from "./StatusEffectManager";
import {
    EffectTrigger,
    StatusEffectContext,
    StatusEffectModification,
    StatusEffectSystemConfig
} from "./types";

export default class StatusEffectSystem {
    private logger = Logger.createContextLogger("StatusEffectSystem");
    private gameState: State;
    private eventBus: EventBus;
    private config: StatusEffectSystemConfig;
    private globalEffectRegistry: Map<string, StatusEffect> = new Map();
    private entityManagers: Map<number, StatusEffectManager> = new Map();

    constructor(gameState: State, config: StatusEffectSystemConfig = {}) {
        this.gameState = gameState;
        this.eventBus = gameState.getEventBus();
        this.config = {
            maxEffectsPerEntity: 20,
            updateInterval: 0.1,
            enableVisualEffects: true,
            debugMode: false,
            ...config
        };

        this.initializeSystem();
    }

    private initializeSystem(): void {
        this.registerDefaultEffects();
        this.setupEntityManagers();
        this.logger.info("StatusEffectSystem initialized");
    }

    private registerDefaultEffects(): void {
        // for (const effect of ALL_EFFECTS) {
        //     this.registerGlobalEffect(effect);
        // }
    }

    private setupEntityManagers(): void {
        const entities = this.gameState.getEntityManager().getAllEntities();

        for (const entity of entities) {
            this.createEntityManager(entity);
        }
    }

    public registerGlobalEffect(effect: StatusEffect): void {
        this.globalEffectRegistry.set(effect.config.id, effect);

        // Register effect with all existing entity managers
        for (const manager of extractMapValues(this.entityManagers)) {
            manager.registerEffect(effect);
        }

        this.logger.debug(`Registered global effect: ${effect.config.name}`);
    }

    public createEntityManager(entity: Entity): StatusEffectManager {
        if (this.entityManagers.has(entity.playerID)) {
            return this.entityManagers.get(entity.playerID)!;
        }

        const manager = new StatusEffectManager(entity, this.eventBus, this.config);

        // Register all global effects with the new manager
        for (const effect of extractMapValues(this.globalEffectRegistry)) {
            manager.registerEffect(effect);
        }

        this.entityManagers.set(entity.playerID, manager);
        this.logger.debug(`Created status effect manager for entity: ${entity.name}`);

        return manager;
    }

    public getEntityManager(entityId: number): StatusEffectManager {
        return this.entityManagers.get(entityId) ?? (this.createEntityManager(this.gameState.getEntityManager().getEntity(entityId)!));
    }

    public async applyEffect(
        entityId: number,
        effectId: string,
        caster?: Entity,
        potency?: number,
        source?: string
    ): Promise<boolean> {
        const entity = this.gameState.getEntityManager().getEntity(entityId);
        if (!entity) {
            this.logger.warn(`Entity not found: ${entityId}`);
            return false;
        }

        const manager = this.getEntityManager(entityId);
        if (!manager) {
            this.logger.warn(`Status effect manager not found for entity: ${entityId}`);
            return false;
        }

        const context: StatusEffectContext = {
            target: entity,
            caster,
            source,
            potency
        };

        return await manager.applyEffect(effectId, context);
    }

    public async removeEffect(entityId: number, effectId: string, caster?: Entity): Promise<number> {
        const manager = this.getEntityManager(entityId);
        if (!manager) {
            return 0;
        }

        return await manager.removeEffectsByType(effectId, caster);
    }

    public getEntityModifications(entityId: number): StatusEffectModification | undefined {
        const manager = this.getEntityManager(entityId);
        if (!manager) {
            return undefined;
        }

        return manager.getComputedModifications();
    }

    public triggerEntityEffects(entityId: number, trigger: EffectTrigger, triggerData?: Record<string, unknown>): void {
        const manager = this.getEntityManager(entityId);
        if (manager) {
            manager.triggerEffects(trigger, triggerData);
        }
    }

    public triggerAllEntityEffects(trigger: EffectTrigger, triggerData?: Record<string, unknown>): void {
        for (const manager of extractMapValues(this.entityManagers)) {
            manager.triggerEffects(trigger, triggerData);
        }
    }

    public hasEffect(entityId: number, effectId: string, caster?: Entity): boolean {
        const manager = this.getEntityManager(entityId);
        if (!manager) {
            return false;
        }

        return manager.hasEffect(effectId, caster);
    }

    public getEffectStacks(entityId: number, effectId: string, caster?: Entity): number {
        const manager = this.getEntityManager(entityId);
        if (!manager) {
            return 0;
        }

        return manager.getEffectStacks(effectId, caster);
    }

    public async purgeAllExpiredEffects(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const manager of extractMapValues(this.entityManagers)) {
            promises.push(manager.purgeExpiredEffects());
        }

        await Promise.all(promises);
    }

    public getSystemStats(): Record<string, unknown> {
        const stats = {
            totalEffects: this.globalEffectRegistry.size(),
            activeEntities: this.entityManagers.size(),
            activeEffectInstances: 0,
            effectsByType: new Map<string, number>()
        };

        for (const manager of extractMapValues(this.entityManagers)) {
            const activeEffects = manager.getActiveEffects();
            stats.activeEffectInstances += activeEffects.size();

            for (const effect of activeEffects) {
                const count = stats.effectsByType.get(effect.effectId) || 0;
                stats.effectsByType.set(effect.effectId, count + 1);
            }
        }

        return stats;
    }

    public destroy(): void {
        for (const manager of extractMapValues(this.entityManagers)) {
            manager.destroy();
        }

        this.entityManagers.clear();
        this.globalEffectRegistry.clear();

        this.logger.info("StatusEffectSystem destroyed");
    }
}
