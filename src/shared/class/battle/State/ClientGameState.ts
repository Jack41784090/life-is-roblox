import { StateConfig, StateState } from "shared/types/battle-types";
import { GameState } from "./GameState";

/**
 * Client-side wrapper for GameState that provides legacy compatibility
 */
export default class ClientGameState extends GameState {
    constructor(config: StateConfig) {
        super(config);
    }

    /**
     * Syncs both GameState and legacy State with received data
     */
    public syncWithServerState(stateData: StateState): void {
        // Update modern state
        if (stateData.grid) {
            this.getGridManager().updateGrid(stateData.grid);
        }

        if (stateData.teams) {
            this.getTeamManager().updateTeams(stateData.teams);
        }
    }
}