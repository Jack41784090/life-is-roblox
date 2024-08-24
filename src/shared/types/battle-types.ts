// // // Physical attributes
// // str: number,    // Strength: muscle density
// // dex: number,    // Dexterity: precision, skill with physical items and tools
// // spd: number,    // Speed: quickness
// // siz: number,    // Size: body mass
// // end: number,    // Endurance: stamina, resistance to fatigue

import Roact from "@rbxts/roact";

// // // Mental attributes
// // int: number,    // Intelligence: knowledge of pragmatic magic
// // spr: number,    // Spirit: connection to the spiritual world
// // fai: number,    // Faith: faith in the divine
// // wil: number,    // Willpower: mental strength
// // cha: number,    // Charisma: ability to influence others
// // beu: number,    // Beauty: physical appearance
export enum BotType {
    Player = 'player',
    Enemy = 'enemy',
}

export type ClashResultFate = "Miss" | "Hit" | "CRIT"

export enum Reality {
    Force = 'force',
    Mana = 'mana',
    Spirituality = 'spirituality',
    Divinity = 'divinity',
    Precision = 'precision',
    Maneuver = 'maneuver',
    Convince = 'convince',
    Bravery = 'bravery',
}

export type EntityStats = {
    id: string;
    str: number;
    dex: number;
    acr: number;
    spd: number;
    siz: number;
    int: number;
    spr: number;
    fai: number;
    cha: number;
    beu: number;
    wil: number;
    end: number;
};

export type EntityInitRequirements =
    Partial<iEntity> &
    { stats: Omit<EntityStats, 'id'>, playerID: number } // requirements: everything is optional exceot stats

export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,

    sta: number,
    hip: number,
    org: number,
    pos: number,

    iconURL?: ReadinessIcon,
    botType?: BotType,
    model?: Instance,
}

export type ReadinessIcon = {
    iconID: number,
    iconUrl: string;
    readiness: number;
}
export interface BattleConfig {
    size: number;
    camera: Camera,
    center: Vector2,
    width: number;
    height: number;
    teamMap: Record<string, Player[]>;
}

export enum ActionType {
    Attack = 'attack',
    Defend = 'defend',
    Move = 'move',
    Wait = 'wait',
}

export type EntityActionOptions = {
    type: ActionType,
    ui: Roact.Tree
}
