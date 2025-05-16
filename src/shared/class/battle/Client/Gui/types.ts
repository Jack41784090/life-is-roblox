import { Atom } from "@rbxts/charm";
import { EventBus } from "../../Events/EventBus";
import { NetworkService } from "../../Network";
import { ReadinessFragment } from "../../Systems/TurnSystem/types";
import { AccessToken } from "../../types";
import EntityHexCellGraphicsMothership from "../Graphics/Mothership";
import State from "../State";

export interface GuiConfig {
    readinessFragments: Atom<Atom<ReadinessFragment>[]>;
    networkService: NetworkService;
    eventBus: EventBus;
}

export type GuiModes = 'withSensitiveCells' | 'onlyReadinessBar';

export type GuiMainUIConfig = {
    EHCGMS: EntityHexCellGraphicsMothership,
    state: State,
    accessToken: AccessToken,
}
