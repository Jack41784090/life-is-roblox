import { Atom } from "@rbxts/charm";
import { NetworkService } from "../../Network/NetworkService";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";

export interface GuiConfig {
    readinessFragments: Atom<ReadinessFragment>[];
    networkService: NetworkService;
}

