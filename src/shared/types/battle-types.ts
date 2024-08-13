// import Entity from '../class/Entity';

// export type WeaponType = 'physical' | 'magical'
// export type WeaponMultiplierAction = 'add' | 'multiply';
// export type WeaponMultiplier = [Reality, WeaponMultiplierAction, WeaponMultiplier | number];
// export interface Weapon {
//     type: WeaponType,
//     name: string,
//     pierce: number,
//     force: number,
//     multipliers: WeaponMultiplier[],
// }
// export interface Armour {
//     name: string,
//     armour: number,
//     defence: number,
// }

// // // Physical attributes
// // str: number,    // Strength: muscle density
// // dex: number,    // Dexterity: precision, skill with physical items and tools
// // spd: number,    // Speed: quickness
// // siz: number,    // Size: body mass
// // end: number,    // Endurance: stamina, resistance to fatigue

// // // Mental attributes
// // int: number,    // Intelligence: knowledge of pragmatic magic
// // spr: number,    // Spirit: connection to the spiritual world
// // fai: number,    // Faith: faith in the divine
// // wil: number,    // Willpower: mental strength
// // cha: number,    // Charisma: ability to influence others
// // beu: number,    // Beauty: physical appearance
// export interface EntityConstance extends PureCombatCharacter {
//     username?: string,
//     iconURL?: string,
//     playerID: number,
// }
// export type EntityInitRequirements = Partial<iEntity> & { base: Omit<EntityConstance, 'id'>, team: string }
// export interface iEntityStats {
//     warSupport: number,
//     stamina: number,
//     hp: number,
//     org: number,
//     pos: number,
// }
// export interface iEntity extends iEntityStats {
//     team: string,
//     base: EntityConstance,
//     name: string,
//     loc: Location,
//     botType?: BotType,
// }

// export enum StatusEffectApplyType {
//     persistent = 'persistent',
//     stackable = 'stackable',
// }
// export interface StatusEffectSource {
//     id: string,
//     from: Entity | Ability,
// }
// export type iStatusEffect = {
//     emoji?: string,
//     source: StatusEffectSource,
//     type: StatusEffectType,
//     applyType: StatusEffectApplyType,
//     name?: EntityStats,
//     value: number,
//     duration: number,
// }
// export enum StatusEffectType {
//     None = 'none',
//     IncreaseStat = 'Buff',
//     DecreaseStat = 'Debuff',
//     MultiplyStat = 'S. Buff',
//     Bleed = 'Bleed',
// }
// export enum TimeSlotState {
//     Past = 'past',
//     Windup = 'windup',
//     Swing = 'swing',
//     Recovery = 'recovery',
//     Idle = 'idle',
// }

// export type ToStringTuple = [{ toString: () => string }, { toString: () => string }]
// export type BeforeAfter = Record<keyof iEntity, ToStringTuple>[]
// export interface iBattleResult {
//     desc: string,
//     attacker: Entity
//     target: Entity
//     vattacker: iEntity,
//     vTarget: iEntity,
//     attackerDiff: BeforeAfter,
//     targetDiff: BeforeAfter,
// }
export interface BattleConfig {
    robloxPlayers: Player[];
}
// export type BattleField = Map<Location, Entity[]>;
// export type Location = 'front' | 'back' | 'front-support' | 'back-support'
// export enum BotType {
//     Player = 'player',
//     Enemy = 'enemy',
// }
// export type FightingEntity = {
//     authorised: string[];
//     characterName: string;
//     str: number;
//     dex: number;
//     acr: number;
//     spd: number;
//     siz: number;
//     int: number;
//     spr: number;
//     fai: number;
//     cha: number;
//     beu: number;
//     wil: number;
//     end: number;
//     description: string;
// };

// export type PureCombatCharacter = Omit<FightingEntity, 'description' | 'authorised'>
// export type ClashResultFate = "Miss" | "Hit" | "CRIT"
// export type EntityStats = keyof Omit<EntityConstance, 'username' | 'id' | 'iconURL'>;
// export enum Reality {
//     Force = 'force',
//     Mana = 'mana',
//     Spirituality = 'spirituality',
//     Divinity = 'divinity',
//     Precision = 'precision',
//     Maneuver = 'maneuver',
//     Convince = 'convince',
//     Bravery = 'bravery',
// }

// export type ClashStringParams =
//     { entity: Entity, type: keyof iEntityStats }
//     &
//     ({ type: keyof iEntity, damage: number, } |
//     { before: number, after: number, });

// export interface DamageReport {
//     weaponPierce: number;
//     weaponForce: number;
//     armourArmour: number;
//     armourDefence: number;

//     weaponDamage: number;
//     pierceDamage: number;
//     forceDamage: number;
//     totalDamage: number;
// }
