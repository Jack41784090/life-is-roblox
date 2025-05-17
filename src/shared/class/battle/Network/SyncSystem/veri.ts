import { t } from "@rbxts/t";
import { EntityStance, EntityState } from "../../State/Entity/types";
import { AbilityType, DamageType, Potency } from "../../Systems/CombatSystem/Ability/types";
import { ActionType } from "../../types";

export const potencyUnion = t.union(
    t.literal(Potency.Strike),
    t.literal(Potency.Slash),
    t.literal(Potency.Stab),
    t.literal(Potency.Light),
    t.literal(Potency.Dark),
    t.literal(Potency.Arcane),
    t.literal(Potency.Elemental),
    t.literal(Potency.Occult),
    t.literal(Potency.Spiritual),
    t.literal(Potency.TheWay)
);

export const damageTypeUnion = t.union(
    t.literal(DamageType.Crush),
    t.literal(DamageType.Cut),
    t.literal(DamageType.Impale),
    t.literal(DamageType.Poison),
    t.literal(DamageType.Fire),
    t.literal(DamageType.Frost),
    t.literal(DamageType.Electric),
    t.literal(DamageType.Psychic),
    t.literal(DamageType.Spiritual),
    t.literal(DamageType.Divine),
    t.literal(DamageType.Necrotic),
    t.literal(DamageType.Arcane)
);

export const realityDamageTranslationEntry = t.optional(t.array(t.strictArray(potencyUnion, t.number)));

export const entityStanceUnion = t.union(
    t.literal(EntityStance.High),
    t.literal(EntityStance.Mid),
    t.literal(EntityStance.Low),
    t.literal(EntityStance.Prone)
);

export const abilityTypeUnion = t.union(
    t.literal(AbilityType.Active),
    t.literal(AbilityType.Reactive)
);

export const activeAbilityStateType = t.interface({
    animation: t.string,
    name: t.string,
    description: t.string,
    icon: t.string,
    type: abilityTypeUnion,
    direction: entityStanceUnion,
    using: t.optional(t.interface({ playerID: t.number, name: t.string }) as t.check<EntityState | undefined>),
    target: t.optional(t.interface({ playerID: t.number, name: t.string }) as t.check<EntityState | undefined>),
    dices: t.array(t.number),
    cost: t.interface({
        pos: t.number,
        mana: t.number,
    }),
    potencies: t.map(potencyUnion, t.number),
    damageType: t.map(damageTypeUnion, t.number),
    range: t.NumberRange,
});

export const weaponStateType = t.interface({
    hitBonus: t.number,
    penetrationBonus: t.number,
    damageTranslation: t.interface({
        'hp': realityDamageTranslationEntry,
        'force': realityDamageTranslationEntry,
        'mana': realityDamageTranslationEntry,
        'spirituality': realityDamageTranslationEntry,
        'divinity': realityDamageTranslationEntry,
        'precision': realityDamageTranslationEntry,
        'maneuver': realityDamageTranslationEntry,
        'convince': realityDamageTranslationEntry,
        'bravery': realityDamageTranslationEntry,
    })
})

export const armourStateType = t.interface({
    DV: t.number,
    PV: t.number,
    resistance: t.map(damageTypeUnion, t.number)
})

export const neoClashResultRollType = t.interface({
    die: t.match("^d%d+$") as t.check<`d${number}`>, // Changed from number to string for template literal
    against: t.union(t.literal('DV'), t.literal('PV')),
    toSurmount: t.number,
    roll: t.number,
    bonus: t.number,
    fate: t.union(t.literal('Miss'), t.literal('Cling'), t.literal('Hit'), t.literal('CRIT'))
})

export const neoClashResultType = t.interface({
    weapon: weaponStateType,
    target: armourStateType,
    result: neoClashResultRollType,
})

export const clashResultType = t.interface({
    damage: t.number,
    u_damage: t.number,
    fate: t.union(t.literal("Miss"), t.literal("Cling"), t.literal("Hit"), t.literal("CRIT")),
    roll: t.number,
    defendAttemptSuccessful: t.boolean,
    defendAttemptName: t.string,
    defendReactionUpdate: t.any, // Simplified ReactionUpdate type
});

export const attackActionRefVerification = t.interface({
    type: t.literal(ActionType.Attack), // Specifically 'attack' for AttackAction
    executed: t.boolean,
    by: t.number,
    against: t.optional(t.number),
    ability: activeAbilityStateType, // Added ability
});

export const clashesVerification = t.array(neoClashResultType);

export const entityMovedEventDataVerification = t.interface({
    entityId: t.number,
    from: t.Vector2,
    to: t.Vector2,
});

export const entityUpdateEventDataVerification = t.interface({
    playerID: t.number,
    entityId: t.number,
    position: t.Vector2,
});

export const turnStartedEventDataVerification = t.interface({
    playerID: t.number,
});

export const gridCellUpdatedEventDataVerification = t.interface({
    newPosition: t.Vector2,
    previousPosition: t.Vector2,
});
