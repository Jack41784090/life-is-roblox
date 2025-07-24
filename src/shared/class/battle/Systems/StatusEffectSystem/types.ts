import { EntityChangeable, EntityStats } from "../../State/Entity/types";
import { DamageType, Potency } from "../CombatSystem/Ability/types";
import { PassiveEffectType } from "../CombatSystem/FightingStyle/type";

export interface EntityInterface {
    name: string;
    playerID: number;
    team: string;
    stats: EntityStats;
    get(property: EntityChangeable): number;
    set(property: EntityChangeable, value: number): any;
    damage(amount: number): void;
    heal(amount: number): void;
    changeHP(amount: number): void;
    setCell(qr: Vector2): void;
    setCell(q: number, r: number): void;
    getActiveStyle(): any;
    getFightingStyles(): any[];
    switchFightingStyle(styleIndex: number): boolean;
    useAbility(abilityName: string): any;
    getAvailableAbilities(): any[];
    recycleAbilities(): void;
}

export enum StatusEffectType {
    Buff = "buff",
    Debuff = "debuff",
    DoT = "dot",
    HoT = "hot",
    Shield = "shield",
    Transformation = "transformation",
    Conditional = "conditional",
    Aura = "aura"
}

export enum StatusEffectCategory {
    Combat = "combat",
    Movement = "movement",
    Resource = "resource",
    Utility = "utility",
    Environmental = "environmental"
}

export enum StackingRule {
    None = "none",
    Replace = "replace",
    Stack = "stack",
    Refresh = "refresh",
    Unique = "unique"
}

export enum EffectTrigger {

    BeforeAttack = 'beforeAttack',
    AfterAttack = 'afterAttack',
    BeforeStrikeSequence = 'beforeStrikeSequence',
    AfterStrikeSequence = 'afterStrikeSequence',
    OnApply = "onApply",
    OnRemove = "onRemove",
    OnTurnStart = "onTurnStart",
    OnTurnEnd = "onTurnEnd",
    OnDealDamage = "onDealDamage",
    OnTakeDamage = "onTakeDamage",
    OnUseAbility = "onUseAbility",
    OnMove = "onMove",
    OnHit = "onHit",
    OnMiss = "onMiss",
    OnCrit = "onCrit",
    OnBlock = "onBlock",
    OnDodge = "onDodge"
}

export interface StatusEffectContext {
    caster?: EntityInterface;
    target: EntityInterface;
    source?: string;
    potency?: number;
}

export interface StatusEffectModifier {
    type: "stat" | "damage" | "ability" | "custom";
    target: string;
    operation: "add" | "multiply" | "set" | "custom";
    value: number | ((context: StatusEffectContext) => number);
    condition?: (context: StatusEffectContext) => boolean;
}

export interface StatusEffectTriggerHandler {
    trigger: EffectTrigger;
    handler: (context: StatusEffectContext) => void | Promise<void>;
    condition?: (context: StatusEffectContext) => boolean;
}

export interface StatusEffectConfig {
    id: string;
    name: string;
    description: string;
    icon?: string;
    type: StatusEffectType;
    category: StatusEffectCategory;
    stackingRule: StackingRule;
    maxStacks?: number;
    duration?: number;
    isPermanent?: boolean;
    isHidden?: boolean;
    priority: number;
    modifiers: StatusEffectModifier[];
    triggers: StatusEffectTriggerHandler[];
    onApply?: (context: StatusEffectContext) => void | Promise<void>;
    onRemove?: (context: StatusEffectContext) => void | Promise<void>;
    onTurnUpdate?: (context: StatusEffectContext) => void | Promise<void>;
    canApply?: (context: StatusEffectContext) => boolean;
    shouldRemove?: (context: StatusEffectContext) => boolean;
    visualEffect?: {
        color?: Color3;
        particle?: string;
        animation?: string;
    };
}

export interface StatusEffectInstance {
    id: string;
    effectId: string;
    config: StatusEffectConfig;
    target: EntityInterface;
    caster?: EntityInterface;
    stacks: number;
    remainingTurns?: number;
    appliedAt: number;
    lastUpdated: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
}

export interface StatusEffectModification {
    statModifiers: Map<keyof EntityStats, number>;
    damageModifiers: Map<DamageType, number>;
    potencyModifiers: Map<Potency, number>;
    passiveEffectModifiers: Map<PassiveEffectType, number>;
    customModifiers: Map<string, number>;
}

export interface StatusEffectSystemConfig {
    maxEffectsPerEntity?: number;
    updateInterval?: number;
    enableVisualEffects?: boolean;
    debugMode?: boolean;
}

export interface StatusEffectEventData {
    effect: StatusEffectInstance;
    entity: EntityInterface;
    eventType: "applied" | "removed" | "updated" | "triggered";
    additionalData?: Record<string, unknown>;
}
