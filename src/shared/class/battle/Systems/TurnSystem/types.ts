import { Atom } from "@rbxts/charm";

export interface TurnSystemConfig {
    gauntletTickInterval: number;
    readinessAtoms: Atom<ReadinessFragment>[];
}

export interface ReadinessFragment {
    id: number,
    spd: Atom<number>,
    pos: Atom<number>,
}
