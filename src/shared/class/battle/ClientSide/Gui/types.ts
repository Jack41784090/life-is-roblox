import { EventBus } from "../../Events/EventBus";
import { NetworkService } from "../../Network/NetworkService";

export interface GuiConfig {
    networkService: NetworkService;
    eventBus: EventBus;
}

