import { Atom } from "@rbxts/charm";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";
import { AccessToken } from "../../types";

export interface GuiConfig {
    readinessFragments: Atom<Atom<ReadinessFragment>[]>;
}

export type GuiMainUIConfig = {
    accessToken: AccessToken,
}
