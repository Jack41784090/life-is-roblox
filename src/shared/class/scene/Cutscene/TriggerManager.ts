import { RunService, Workspace } from "@rbxts/services";
import Logger from "shared/utils/Logger";
import { Cutscene } from ".";
import { MoveTrigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";

/**
 * Manages the creation, storage, and execution of triggers
 * Follows Single Responsibility Principle by separating trigger management from cutscene logic
 */
export class TriggerManager {
    private logger = Logger.createContextLogger("TriggerManager");
    private triggeredMap: Map<string, boolean> = new Map<string, boolean>();
    private allTriggers: Array<TriggerPair> = [];

    constructor() { }

    /**
     * Mark a trigger as activated or not
     */
    public setTriggerStatus(name: string, status: boolean): void {
        this.triggeredMap.set(name, status);
    }

    /**
     * Check if a trigger has been activated
     */
    public isTriggerActivated(triggerName: string): boolean {
        const trigger = this.triggeredMap.get(triggerName);
        if (trigger === undefined) {
            this.logger.error("Trigger not found", triggerName);
            return false;
        }
        return trigger;
    }

    /**
     * Register a new trigger in the tracking system
     */
    public registerTrigger(name: string): void {
        this.triggeredMap.set(name, false);
    }

    /**
     * Process an immediate move trigger (time=0)
     */
    public handleImmediateMoveTrigger(trigger: MoveTrigger, cutscene: Cutscene): void {
        if (trigger.modelID === 'camera') {
            // Handle camera immediate positioning
            const cc = Workspace.CurrentCamera;
            if (!cc) {
                this.logger.error("No current camera found");
                return;
            }

            cc.CameraType = Enum.CameraType.Scriptable;
            cc.CFrame = trigger.dest.CFrame;
        } else {
            // Handle actor immediate positioning
            const actor = cutscene.getActor(trigger.modelID);
            if (actor) {
                actor.getModel().PivotTo(trigger.dest.CFrame);
            } else {
                this.logger.error("No actor found with id", trigger.modelID);
            }
        }
        trigger.activated = true;
        trigger.finished = true;
    }

    /**
     * Run a trigger and monitor its completion
     */
    public executeTrigger(triggerPair: TriggerPair, cutscene: Cutscene): void {
        this.allTriggers.push(triggerPair);
        const time = triggerPair[0];
        const trigger = triggerPair[1];

        // For time=0 MoveTrigger, handle with immediate positioning instead of pathfinding
        if (time === 0 && trigger instanceof MoveTrigger) {
            this.logger.info(`Immediate MoveTrigger ${trigger.name} activated`, trigger);
            this.handleImmediateMoveTrigger(trigger, cutscene);
        }
        // For all other triggers or non-zero time triggers, use the OOP approach
        else {
            this.logger.info(`Normal Trigger ${trigger.name} activated`, trigger);
            trigger.run(cutscene);
        }

        // Monitor when the trigger completes
        const checkFinish = RunService.RenderStepped.Connect(() => {
            if (trigger.finished) {
                this.setTriggerStatus(trigger.name, true);
                this.logger.info(`Trigger ${trigger.name} finished`);
                checkFinish.Disconnect();
            }
        });
    }

    public getAllTriggers(): Array<TriggerPair> {
        return this.allTriggers;
    }
}
