import State from "shared/class/battle/State";
import { StateConfig, StateState } from "shared/class/battle/types";

/**
 * Client-side wrapper for State that provides legacy compatibility
 */
export default class ClientGameState extends State {
    constructor(config: Omit<StateConfig, 'teamMap'>) {
        super({
            ...config,
            teamMap: {}
        });
    }

    /**
     * Syncs both State and legacy State with received data
     */
    public syncWithServerState(stateData: StateState): void {
        this.logger.info("Syncing with server state", stateData);
        this.sync(stateData);
    }
}