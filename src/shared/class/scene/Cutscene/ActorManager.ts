import Logger from "shared/utils/Logger";
import { ActorConfig } from "./types";

/**
 * Manages actor initialization and tracking
 * Follows Single Responsibility Principle by separating actor management from cutscene logic
 */
export class ActorManager {
    private logger = Logger.createContextLogger("ActorManager");
    private actorInitPositions: Map<string, Vector3> = new Map<string, Vector3>();

    constructor() { }

    /**
     * Set an actor's initial position
     */
    public setActorInitPosition(actorName: string, position: Vector3): void {
        this.actorInitPositions.set(actorName, position);
    }

    /**
     * Get all actor configurations based on initial positions
     */
    public getActorConfigs(): ActorConfig[] {
        const actorConfigs: ActorConfig[] = [];

        this.actorInitPositions.forEach((position, actorName) => {
            actorConfigs.push({
                id: actorName,
                displayName: actorName,
                spawnLocation: position,
            });
        });

        return actorConfigs;
    }

    /**
     * Check if an actor exists in the manager
     */
    public hasActor(actorName: string): boolean {
        return this.actorInitPositions.has(actorName);
    }

    /**
     * Get an actor's initial position
     */
    public getActorInitPosition(actorName: string): Vector3 | undefined {
        return this.actorInitPositions.get(actorName);
    }
}
