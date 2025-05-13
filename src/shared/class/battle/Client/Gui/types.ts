import { Atom } from "@rbxts/charm";
import { NetworkService } from "../../Network";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";

export interface GuiConfig {
    readinessFragments: Atom<Atom<ReadinessFragment>[]>;
    networkService: NetworkService;
}

