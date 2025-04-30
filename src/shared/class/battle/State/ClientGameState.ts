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
        this.logger.debug("Syncing with server state", stateData);

        if (stateData.grid) {
            this.logger.debug("| Updating grid state");
            this.getGridManager().updateGrid(stateData.grid);
        }

        if (stateData.teams) {
            this.logger.debug("| Updating team states");
            const teammanager = this.getTeamManager();
            const entityManager = this.getEntityManager();
            teammanager.updateTeams(stateData.teams);
            const teamStates = teammanager.getTeamStates();
            for (const teamState of teamStates) {
                this.logger.debug(`Team ${teamState.name} has ${teamState.members.size()} members`);
                for (const member of teamState.members) {
                    this.logger.debug(`Member: ${member.name} (${member.playerID})`);
                    const entity = entityManager.getEntity(member.playerID);
                    if (entity) {
                        entity.update(member);
                    } else {
                        this.logger.warn(`Entity ${member.playerID} not found for team ${teamState.name}`);
                        // might need to create a new entity
                        this.createEntity(teamState.name, member);
                    }
                }
            }
        }

        if (stateData.cre) {
            this.logger.debug("| Updating CRE state");
            this.setCRE(stateData.cre);
        }

        this.logger.debug("| Finished syncing with server state");
    }
}