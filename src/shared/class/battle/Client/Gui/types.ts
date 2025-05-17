import { Atom } from "@rbxts/charm";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";
import { AccessToken } from "../../types";
import Graphics from "../Graphics";
import State from "../State";

export interface GuiConfig {
    readinessFragments: Atom<Atom<ReadinessFragment>[]>;
}

export type GuiModes = 'withSensitiveCells' | 'onlyReadinessBar';

export type GuiMainUIConfig = {
    EHCGMS: Graphics,
    state: State,
    accessToken: AccessToken,
}
