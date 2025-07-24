import {
    BerserkEffect,
    BurnEffect,
    FortifyEffect,
    HasteEffect,
    InvisibilityEffect,
    PoisonEffect,
    RegenerationEffect,
    ShieldEffect,
    SlowEffect,
    StrengthEffect,
    StunEffect,
    VulnerabilityEffect,
    WeaknessEffect
} from "./StatusEffect/defaults";
import {
    StackingRule,
    StatusEffectCategory,
    StatusEffectConfig,
    StatusEffectType
} from "./types";

// Example configurations for the status effects
export const BURN_CONFIG: StatusEffectConfig = {
    id: "burn",
    name: "Burn",
    description: "Deals fire damage over time and can spread to nearby enemies",
    type: StatusEffectType.DoT,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 5,
    duration: 3,
    priority: 100,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 0.4, 0),
        particle: "Fire"
    }
};

export const POISON_CONFIG: StatusEffectConfig = {
    id: "poison",
    name: "Poison",
    description: "Deals damage over time and reduces healing effectiveness",
    type: StatusEffectType.DoT,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 4,
    priority: 90,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.5, 1, 0.2),
        particle: "Poison"
    }
};

export const REGENERATION_CONFIG: StatusEffectConfig = {
    id: "regeneration",
    name: "Regeneration",
    description: "Heals over time with bonus healing at low health",
    type: StatusEffectType.HoT,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 5,
    priority: 85,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.2, 1, 0.2),
        particle: "Heal"
    }
};

export const HASTE_CONFIG: StatusEffectConfig = {
    id: "haste",
    name: "Haste",
    description: "Increases speed and reduces action costs",
    type: StatusEffectType.Buff,
    category: StatusEffectCategory.Movement,
    stackingRule: StackingRule.Refresh,
    maxStacks: 1,
    duration: 3,
    priority: 110,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 1, 0.2),
        animation: "SpeedLines"
    }
};

export const SLOW_CONFIG: StatusEffectConfig = {
    id: "slow",
    name: "Slow",
    description: "Reduces movement speed and increases action costs",
    type: StatusEffectType.Debuff,
    category: StatusEffectCategory.Movement,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 4,
    priority: 80,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.3, 0.3, 1),
        animation: "SlowMotion"
    }
};

export const STRENGTH_CONFIG: StatusEffectConfig = {
    id: "strength",
    name: "Strength",
    description: "Increases physical damage dealt",
    type: StatusEffectType.Buff,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 5,
    duration: 6,
    priority: 95,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 0.2, 0.2),
        animation: "PowerAura"
    }
};

export const WEAKNESS_CONFIG: StatusEffectConfig = {
    id: "weakness",
    name: "Weakness",
    description: "Reduces physical damage dealt",
    type: StatusEffectType.Debuff,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 5,
    priority: 75,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.7, 0.7, 0.7),
        animation: "Fatigue"
    }
};

export const FORTIFY_CONFIG: StatusEffectConfig = {
    id: "fortify",
    name: "Fortify",
    description: "Increases damage resistance",
    type: StatusEffectType.Buff,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 8,
    priority: 105,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.5, 0.5, 1),
        animation: "Shield"
    }
};

export const VULNERABILITY_CONFIG: StatusEffectConfig = {
    id: "vulnerability",
    name: "Vulnerability",
    description: "Increases damage taken",
    type: StatusEffectType.Debuff,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 4,
    priority: 70,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 0.5, 1),
        animation: "Crack"
    }
};

export const STUN_CONFIG: StatusEffectConfig = {
    id: "stun",
    name: "Stun",
    description: "Prevents all actions",
    type: StatusEffectType.Debuff,
    category: StatusEffectCategory.Utility,
    stackingRule: StackingRule.Refresh,
    maxStacks: 1,
    duration: 2,
    priority: 200,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 1, 0),
        animation: "Lightning"
    }
};

export const INVISIBILITY_CONFIG: StatusEffectConfig = {
    id: "invisibility",
    name: "Invisibility",
    description: "Grants stealth, dodge chance, and reduced movement costs",
    type: StatusEffectType.Buff,
    category: StatusEffectCategory.Utility,
    stackingRule: StackingRule.Replace,
    maxStacks: 1,
    duration: 3,
    priority: 150,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.3, 0.3, 0.3),
        animation: "Transparency"
    }
};

export const BERSERK_CONFIG: StatusEffectConfig = {
    id: "berserk",
    name: "Berserk",
    description: "Massively increases damage but reduces defense",
    type: StatusEffectType.Transformation,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Replace,
    maxStacks: 1,
    duration: 4,
    priority: 120,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(1, 0, 0),
        animation: "Rage"
    }
};

export const SHIELD_CONFIG: StatusEffectConfig = {
    id: "shield",
    name: "Shield",
    description: "Absorbs incoming damage",
    type: StatusEffectType.Shield,
    category: StatusEffectCategory.Combat,
    stackingRule: StackingRule.Stack,
    maxStacks: 3,
    duration: 10,
    priority: 130,
    modifiers: [],
    triggers: [],
    visualEffect: {
        color: new Color3(0.8, 0.8, 1),
        animation: "Barrier"
    }
};

// Registry setup function
export function registerDefaultStatusEffects(statusEffectSystem: any) {
    // Register all default status effects
    statusEffectSystem.registerEffect(BURN_CONFIG, new BurnEffect(BURN_CONFIG));
    statusEffectSystem.registerEffect(POISON_CONFIG, new PoisonEffect(POISON_CONFIG));
    statusEffectSystem.registerEffect(REGENERATION_CONFIG, new RegenerationEffect(REGENERATION_CONFIG));
    statusEffectSystem.registerEffect(HASTE_CONFIG, new HasteEffect(HASTE_CONFIG));
    statusEffectSystem.registerEffect(SLOW_CONFIG, new SlowEffect(SLOW_CONFIG));
    statusEffectSystem.registerEffect(STRENGTH_CONFIG, new StrengthEffect(STRENGTH_CONFIG));
    statusEffectSystem.registerEffect(WEAKNESS_CONFIG, new WeaknessEffect(WEAKNESS_CONFIG));
    statusEffectSystem.registerEffect(FORTIFY_CONFIG, new FortifyEffect(FORTIFY_CONFIG));
    statusEffectSystem.registerEffect(VULNERABILITY_CONFIG, new VulnerabilityEffect(VULNERABILITY_CONFIG));
    statusEffectSystem.registerEffect(STUN_CONFIG, new StunEffect(STUN_CONFIG));
    statusEffectSystem.registerEffect(INVISIBILITY_CONFIG, new InvisibilityEffect(INVISIBILITY_CONFIG));
    statusEffectSystem.registerEffect(BERSERK_CONFIG, new BerserkEffect(BERSERK_CONFIG));
    statusEffectSystem.registerEffect(SHIELD_CONFIG, new ShieldEffect(SHIELD_CONFIG));
}

// Export all effects for easy access
export const DEFAULT_STATUS_EFFECTS = {
    BURN: { config: BURN_CONFIG, effect: BurnEffect },
    POISON: { config: POISON_CONFIG, effect: PoisonEffect },
    REGENERATION: { config: REGENERATION_CONFIG, effect: RegenerationEffect },
    HASTE: { config: HASTE_CONFIG, effect: HasteEffect },
    SLOW: { config: SLOW_CONFIG, effect: SlowEffect },
    STRENGTH: { config: STRENGTH_CONFIG, effect: StrengthEffect },
    WEAKNESS: { config: WEAKNESS_CONFIG, effect: WeaknessEffect },
    FORTIFY: { config: FORTIFY_CONFIG, effect: FortifyEffect },
    VULNERABILITY: { config: VULNERABILITY_CONFIG, effect: VulnerabilityEffect },
    STUN: { config: STUN_CONFIG, effect: StunEffect },
    INVISIBILITY: { config: INVISIBILITY_CONFIG, effect: InvisibilityEffect },
    BERSERK: { config: BERSERK_CONFIG, effect: BerserkEffect },
    SHIELD: { config: SHIELD_CONFIG, effect: ShieldEffect }
};
