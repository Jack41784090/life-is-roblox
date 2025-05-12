import State from "shared/class/battle/State";
import { StateConfig } from "shared/class/battle/types";

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
}