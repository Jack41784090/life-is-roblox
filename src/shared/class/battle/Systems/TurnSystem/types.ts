import { Atom } from "@rbxts/charm";

export interface TurnSystemConfig {
    gauntletTickInterval: number;
    readinessAtoms: Atom<Atom<ReadinessFragment>[]>;
}

export interface ReadinessFragment {
    icon?: string;
    id: number,
    spd: Atom<number>,
    pos: Atom<number>,
}

export interface TurnSystemState {
    currentActorId: number;
    isGauntletRunning: boolean;
    listOfReadinessState: ReadinessFragment[];
}
