import { ReactionUpdate } from "./Ability/types"
import { ArmourState } from "./Armour/types"
import { WeaponState } from "./Weapon/types"

export type ClashResultFate = "Miss" | "Cling" | "Hit" | "CRIT"

export enum Reality {
    HP = 'hp',
    Force = 'force',
    Mana = 'mana',
    Spirituality = 'spirituality',
    Divinity = 'divinity',
    Precision = 'precision',
    Maneuver = 'maneuver',
    Convince = 'convince',
    Bravery = 'bravery',
}

export interface ClashResult {
    damage: number,
    u_damage: number,
    fate: ClashResultFate,
    roll: number,
    defendAttemptSuccessful: boolean,
    defendAttemptName: string,
    defendReactionUpdate: ReactionUpdate,
}

export interface NeoClashResultRoll {
    die: `d${number}`,
    against: 'DV' | 'PV',
    toSurmount: number,
    roll: number,
    bonus: number,
    fate: ClashResultFate,
    damage?: number // Adding damage field to store the final calculated damage
    // damage: [DamageType, number]
}

export interface NeoClashResult {
    weapon: WeaponState
    armour: ArmourState,
    result: NeoClashResultRoll,
    clashKills: boolean,
}

export type StrikeSequence = Array<NeoClashResult>

export interface StrikeSequenceRoll {
    rollResult: NeoClashResult;
    success: boolean;
    diceUsed?: number
}

export interface StrikeSequenceResult {
    sequence: StrikeSequenceRoll[];
    success: boolean;
}
