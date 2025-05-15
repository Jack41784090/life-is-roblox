import Logger from "shared/utils/Logger";
import { LookAtTrigger, MoveTrigger, SpeakTrigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";
import { CutsceneAction } from "./types";

/**
 * Factory class responsible for creating different types of triggers
 * Follows the Factory design pattern to encapsulate trigger creation logic
 */
export class TriggerFactory {
    private logger = Logger.createContextLogger("TriggerFactory");

    /**
     * Create a trigger based on a BasePart
     */
    public createMoveTrigger(
        time: number,
        part: BasePart,
        modelID: string,
        name: string,
        triggersAfter?: string,
        delay?: number
    ): TriggerPair {
        return [time, new MoveTrigger({
            modelID,
            cutsceneAction: CutsceneAction.Move,
            dest: part,
            name,
            triggersAfter,
            delay,
        })];
    }

    /**
     * Create a trigger based on a StringValue with 'LookAt' value
     */
    public createLookAtTrigger(
        time: number,
        name: string,
        modelID: string,
        lookAtActor: string,
        triggersAfter?: string,
        delay?: number
    ): TriggerPair {
        return [time, new LookAtTrigger({
            modelID,
            cutsceneAction: CutsceneAction.Move,
            name,
            triggersAfter,
            delay,
            lookAtActor
        })];
    }

    /**
     * Create a trigger based on a StringValue with 'Speak' value
     */
    public createSpeakTrigger(
        time: number,
        name: string,
        modelID: string,
        text: string,
        triggersAfter?: string,
        delay?: number
    ): TriggerPair {
        return [time, new SpeakTrigger({
            modelID,
            cutsceneAction: CutsceneAction.Move,
            name,
            triggersAfter,
            delay,
            text
        })];
    }

    /**
     * Create a camera movement trigger
     */
    public createCameraMoveTrigger(time: number, part: BasePart, name: string): TriggerPair {
        return [time, new MoveTrigger({
            modelID: 'camera',
            cutsceneAction: CutsceneAction.Move,
            dest: part,
            name,
        })];
    }
}