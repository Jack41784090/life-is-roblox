import { ReadinessIcon } from "shared/types/battle-types";

export interface iEntity {
    readonly playerID: number;
    stats: EntityStats,
    team?: string,
    name: string,
    iconURL?: ReadinessIcon,
    model?: Instance,
    qr: Vector2,
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
export type EntityStatsNoID = Omit<EntityStats, 'id'>;
export type EntityInitHardRequirements = {
    qr: Vector2;
    playerID: number;
    stats: EntityStats;
    hip: number;
    pos: number;
    org: number;
    sta: number;
    mana: number;
}
export type EntityInit = Partial<iEntity> & EntityInitHardRequirements;
export type EntityStatsUpdate = Partial<EntityStatsNoID>;
export type EntityState = EntityInitHardRequirements & {
    name: string;
    team?: string;
    armed?: keyof typeof Enum.KeyCode;
    qr?: Vector2;
    stance: EntityStance;
}
export type ReadonlyEntityState = Readonly<EntityState>;
export type EntityUpdate = Partial<Omit<EntityState, 'playerID'>> & {
    playerID: number;
}
export enum EntityStance {
    High = 'high',
    Mid = 'mid',
    Low = 'low',
    Prone = 'prone',
}

export type EntityChangeable = keyof Omit<EntityInitHardRequirements, 'qr' | 'playerID' | 'stats'>
