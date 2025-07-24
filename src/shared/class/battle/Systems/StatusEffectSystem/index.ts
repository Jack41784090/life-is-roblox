import Logger from "shared/utils/Logger";
import State from "../../State";
import Entity from "../../State/Entity";
import { EntityState } from "../../State/Entity/types";
import { TriggerModify } from "../CombatSystem/types";
import { registerDefaultStatusEffects } from "./registry";
import StatusEffect from "./StatusEffect";
import StatusEffectManager from "./StatusEffectManager";
import {
    StatusEffectSystemConfig
} from "./types";

export default class StatusEffectSystem {
    private logger = Logger.createContextLogger("StatusEffectSystem");
    private gameState: State;
    private config: StatusEffectSystemConfig;
    private globalEffectRegistry: Map<string, StatusEffect> = new Map();
    private entityManagers: Map<number, StatusEffectManager> = new Map();

    constructor(gameState: State, config: StatusEffectSystemConfig = {}) {
        this.gameState = gameState;
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
        registerDefaultStatusEffects(this);
        this.setupEntityManagers();
        this.logger.info("StatusEffectSystem initialized");
    }

    private setupEntityManagers(): void {
        const entities = this.gameState.getEntityManager().getAllEntities();
        for (const entity of entities) {
            if (this.entityManagers.has(entity.playerID)) {
                continue;
            }

            const manager = new StatusEffectManager(entity, this.gameState.getEventBus());
            this.globalEffectRegistry.forEach((effect) => {
                manager.registerEffect(effect);
            });

            this.entityManagers.set(entity.playerID, manager);
            this.logger.debug(`Created status effect manager for entity: ${entity.name}`);
        }
    }

    public getEntityManager(entityId: number): StatusEffectManager | undefined {
        return this.entityManagers.get(entityId);
    }

    public getDefaultDuration(triggerModify: TriggerModify): number {
        const baseTurns = 3;
        const magnitude = math.abs(triggerModify.value);

        if (magnitude >= 10) return math.ceil(baseTurns * 1.5);
        if (magnitude >= 5) return math.ceil(baseTurns * 1.2);
        if (magnitude <= 2) return math.ceil(baseTurns * 0.8);

        return baseTurns;
    }

    public async applyImmediateStatChange(triggerModify: TriggerModify, target: Entity): Promise<void>;
    public async applyImmediateStatChange(triggerModify: TriggerModify, target: EntityState): Promise<void>;
    public async applyImmediateStatChange(triggerModify: TriggerModify, target: Entity | EntityState): Promise<void> {
        const property = triggerModify.mod;

        if (target instanceof Entity) {
            // Handle Entity instance
            if (property === 'pos' || property === 'hip' || property === 'org' || property === 'sta' || property === 'mana') {
                const currentValue = target.get(property);
                const newValue = currentValue + triggerModify.value;
                target.set(property, math.max(0, newValue));
                this.logger.debug(`Immediate stat change: ${target.name} ${property} ${currentValue} → ${newValue}`);
            }
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
        } else {
            // Handle EntityState object
            if (property === 'pos' || property === 'hip' || property === 'org' || property === 'sta' || property === 'mana') {
                const currentValue = target[property];
                const newValue = currentValue + triggerModify.value;
                target[property] = math.max(0, newValue);
                this.logger.debug(`Immediate stat change: ${target.name} ${property} ${currentValue} → ${newValue}`);
            }
            else if (property === 'str' || property === 'dex' || property === 'acr' || property === 'spd' ||
                property === 'siz' || property === 'int' || property === 'spr' || property === 'fai' ||
                property === 'cha' || property === 'beu' || property === 'wil' || property === 'end') {
                const currentValue = target.stats[property];
                const newValue = currentValue + triggerModify.value;
                target.stats[property] = math.max(0, newValue);
                this.logger.debug(`Immediate stat change: ${target.name} ${property} ${currentValue} → ${newValue}`);
            }
            else {
                this.logger.warn(`Unknown property in TriggerModify: ${property}`);
            }
        }
    }
}
