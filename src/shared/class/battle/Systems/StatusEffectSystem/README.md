# Status Effect System - Default Effects

This directory contains a comprehensive set of default status effects that can be registered with your StatusEffectSystem.

## Available Status Effects

### Damage Over Time (DoT)
- **BurnEffect**: Fire damage over time with spreading capability
- **PoisonEffect**: Poison damage that also reduces healing effectiveness

### Healing Over Time (HoT)
- **RegenerationEffect**: Heals over time with bonus healing at low health

### Movement Effects
- **HasteEffect**: Increases speed stat
- **SlowEffect**: Reduces speed stat

### Combat Buffs
- **StrengthEffect**: Increases strength (str) stat for more damage
- **FortifyEffect**: Increases endurance (end) stat for more defense
- **ShieldEffect**: Absorbs incoming damage

### Combat Debuffs
- **WeaknessEffect**: Reduces strength (str) stat
- **VulnerabilityEffect**: Reduces endurance (end) stat

### Utility Effects
- **StunEffect**: Prevents all actions
- **InvisibilityEffect**: Grants stealth with dodge bonus and reduced movement costs

### Transformation Effects
- **BerserkEffect**: Massively increases attack but reduces defense

## Usage

### 1. Register Effects with the System

```typescript
import { registerDefaultStatusEffects } from "./registry";

const statusEffectSystem = gameState.getStatusEffectSystem();
registerDefaultStatusEffects(statusEffectSystem);
```

### 2. Apply Effects to Entities

```typescript
import { applyBurnToEntity, applyShieldToEntity } from "./examples";

// Apply burn with custom damage
applyBurnToEntity(gameState, targetEntityId, casterEntityId);

// Apply shield with custom amount
applyShieldToEntity(gameState, targetEntityId, 100);
```

### 3. Check for Active Effects

```typescript
import { isEntityStunned, getEntityShieldAmount } from "./examples";

if (isEntityStunned(gameState, entityId)) {
    // Entity cannot act
}

const shieldAmount = getEntityShieldAmount(gameState, entityId);
```

## Files

- **`defaults.ts`**: Contains all the status effect class implementations
- **`registry.ts`**: Contains configurations and registration function
- **`examples.ts`**: Contains usage examples and helper functions
- **`README.md`**: This documentation file

## Effect Categories

Each effect has been categorized for better organization:
- **Combat**: Damage/healing related effects
- **Movement**: Speed and positioning effects  
- **Utility**: Special mechanics like stun and invisibility
- **Resource**: Mana and stamina related effects (extensible)
- **Environmental**: Area-based effects (extensible)

## Customization

All effects can be customized by:
1. Modifying their configurations in `registry.ts`
2. Extending the base effect classes in `defaults.ts`
3. Adding custom metadata when applying effects

Example with custom metadata:
```typescript
statusEffectSystem.applyEffect("burn", {
    target: entity,
    caster: caster,
    source: "fire_spell"
}, {
    baseDamage: 15,  // Custom damage
    spreadChance: 0.3  // Custom spread chance
});
```

## Integration with Combat System

These effects integrate seamlessly with the existing combat system by:
- Modifying entity stats directly (str, end, spd, etc.)
- Using the Reality calculation system for damage/healing
- Following the turn-based update cycle
- Emitting events for visual effects and UI updates

The effects are designed to work with AAA game standards and follow the coding conventions specified in the project guidelines.
