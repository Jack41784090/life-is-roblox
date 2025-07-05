# TriggerMap Data-Driven Design Guide

## Overview

The TriggerMap system has been redesigned to be fully data-driven, eliminating hardcoded logic and giving ability designers complete control over what status effects are applied at each combat stage.

## Key Changes

### Before (Old Approach)
- Abilities used `triggerMap` methods that returned `void`
- Hardcoded `generateTriggerModifiesFromAbility` method created TriggerModify objects based on ability characteristics
- Limited flexibility, required code changes for new ability behaviors

### After (New Approach)
- Abilities use `triggerMap` methods that return `TriggerModify[]`
- Combat system directly collects and applies these TriggerModify objects
- Complete data-driven approach - no hardcoded generation logic needed

## TriggerMap Structure

```typescript
triggerMap?: {
    beforeAttack?: (context: AbilityContext) => TriggerModify[];
    afterAttack?: (context: AbilityContext) => TriggerModify[];
    beforeStrikeSequence?: (context: AbilityContext) => TriggerModify[];
    afterStrikeSequence?: (context: AbilityContext) => TriggerModify[];
}
```

### Context Object
```typescript
interface AbilityContext {
    attacker: EntityState;
    defender: EntityState;
}
```

### TriggerModify Object
```typescript
interface TriggerModify {
    targeting: 'attacker' | 'defender';
    mod: EntityChangeable | EntityStatistics;
    value: number;
}
```

## Combat Timing

1. **beforeAttack**: Called once before any strike sequences are processed
2. **beforeStrikeSequence**: Called before each individual strike sequence (multiple times if ability has multiple dice)
3. **afterStrikeSequence**: Called after each individual strike sequence
4. **afterAttack**: Called once after all strike sequences are complete

## Simple Examples

### Basic Stat Boost
```typescript
triggerMap: {
    beforeAttack: (context) => [
        {
            targeting: 'attacker',
            mod: 'str',
            value: 3
        }
    ]
}
```

### Multi-Effect Combination
```typescript
triggerMap: {
    beforeAttack: (context) => [
        {
            targeting: 'attacker',
            mod: 'str',
            value: 2
        },
        {
            targeting: 'attacker',
            mod: 'dex',
            value: 1
        }
    ],
    afterAttack: (context) => [
        {
            targeting: 'defender',
            mod: 'pos',
            value: -5
        }
    ]
}
```

## Advanced Examples

### Conditional Logic
```typescript
triggerMap: {
    beforeAttack: (context) => {
        const { attacker, defender } = context;
        const triggers = [];

        // Boost strength if we're stronger
        if (attacker.stats.str > defender.stats.str) {
            triggers.push({
                targeting: 'attacker',
                mod: 'dex',
                value: 3
            });
        } else {
            triggers.push({
                targeting: 'attacker',
                mod: 'str',
                value: 4
            });
        }

        // Extra damage if enemy is low health
        if (defender.atoms.hip < 50) {
            triggers.push({
                targeting: 'defender',
                mod: 'pos',
                value: -8
            });
        }

        return triggers;
    }
}
```

### Resource Management
```typescript
triggerMap: {
    beforeAttack: (context) => [
        // Spend mana for extra power
        {
            targeting: 'attacker',
            mod: 'mana',
            value: -10
        },
        {
            targeting: 'attacker',
            mod: 'str',
            value: 5
        }
    ],
    afterAttack: (context) => [
        // Restore some mana after successful attack
        {
            targeting: 'attacker',
            mod: 'mana',
            value: 5
        }
    ]
}
```

## Available Stat Types

### EntityChangeable (Atoms)
- `hip` - Health Points
- `pos` - Posture  
- `org` - Organization
- `sta` - Stamina
- `mana` - Mana

### EntityStatistics (Stats)
- `str` - Strength
- `dex` - Dexterity
- `acr` - Acrobatics
- `spd` - Speed
- `siz` - Size
- `int` - Intelligence
- `spr` - Spirit
- `fai` - Faith
- `cha` - Charisma
- `beu` - Beauty
- `wil` - Will
- `end` - Endurance

## Best Practices

### 1. Use Appropriate Timing
- `beforeAttack` for pre-combat setup and resource spending
- `beforeStrikeSequence` for per-strike bonuses that accumulate
- `afterStrikeSequence` for immediate strike-based effects
- `afterAttack` for cleanup, resource restoration, and lasting debuffs

### 2. Balance Positive and Negative Values
```typescript
// Good: Berserker ability that trades defense for offense
triggerMap: {
    beforeAttack: (context) => [
        { targeting: 'attacker', mod: 'str', value: 8 },    // Big damage boost
        { targeting: 'attacker', mod: 'dex', value: -3 },   // But lose accuracy
        { targeting: 'attacker', mod: 'acr', value: -5 }    // And lose defense
    ]
}
```

### 3. Use Conditional Logic for Dynamic Abilities
```typescript
// Adaptive ability that responds to combat state
triggerMap: {
    beforeAttack: (context) => {
        const triggers = [];
        const { attacker, defender } = context;
        
        if (attacker.atoms.mana < 20) {
            // Low mana? Focus on mana recovery
            triggers.push({ targeting: 'attacker', mod: 'mana', value: 15 });
        } else {
            // High mana? Spend it for damage
            triggers.push({ targeting: 'attacker', mod: 'mana', value: -10 });
            triggers.push({ targeting: 'attacker', mod: 'str', value: 5 });
        }
        
        return triggers;
    }
}
```

### 4. Consider Targeting Strategy
- `targeting: 'attacker'` for self-buffs, resource management, and personal costs
- `targeting: 'defender'` for debuffs, damage amplification, and enemy weakening

### 5. Scale Values Appropriately
- Small frequent effects: 1-3 points
- Medium impactful effects: 4-8 points  
- Large dramatic effects: 10+ points (usually with costs)

## Integration with Status Effects

The TriggerModify objects are automatically converted into appropriate status effects:
- Positive values become buffs with green visual effects
- Negative values become debuffs with red visual effects
- Duration is calculated based on the magnitude of the effect
- Effects stack according to the status effect system rules

## Migration from Old System

If you have abilities using the old hardcoded approach:

1. Remove calls to `generateTriggerModifiesFromAbility`
2. Update triggerMap methods to return `TriggerModify[]` instead of `void`
3. Replace direct state mutations with TriggerModify objects
4. Test the new behavior to ensure it matches the old system

Example migration:
```typescript
// Old way
triggerMap: {
    beforeAttack: (context) => {
        context.attacker.stats.str += 2;
        context.defender.atoms.pos -= 5;
    }
}

// New way
triggerMap: {
    beforeAttack: (context) => [
        { targeting: 'attacker', mod: 'str', value: 2 },
        { targeting: 'defender', mod: 'pos', value: -5 }
    ]
}
```

## Testing Your Abilities

1. Create ability configurations using the new triggerMap structure
2. Test in combat to verify timing and effects
3. Check status effect application in the UI
4. Verify that conditional logic works as expected
5. Balance values based on gameplay testing
