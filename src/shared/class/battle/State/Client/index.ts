import { StateConfig, StateState } from "shared/class/battle/types";
import { GameState } from "..";

/**
 * Client-side wrapper for GameState that provides legacy compatibility
 */
export default class ClientGameState extends GameState {
    constructor(config: Omit<StateConfig, 'teamMap'>) {
        super({
            ...config,
            teamMap: {}
        });
    }

    /**
     * Syncs both GameState and legacy State with received data
     */
    public syncWithServerState(stateData: StateState): void {
        this.logger.info("Syncing with server state", stateData);
        this.sync(stateData);
    }
}