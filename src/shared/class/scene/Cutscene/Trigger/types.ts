import { Trigger } from ".";
import { CutsceneAction } from "../types";

export type TriggerConfig = {
    name: string,
    modelID: string,
    cutsceneAction: CutsceneAction,
    activateAfter?: string,
}
export type MoveTriggerConfig = TriggerConfig & {
    dest: BasePart,
}

export type LookAtTriggerConfig = TriggerConfig & {
    lookAtActor: string,
}

export type TriggerMap = Array<TriggerPair>
export type TriggerPair = [number, Trigger];

