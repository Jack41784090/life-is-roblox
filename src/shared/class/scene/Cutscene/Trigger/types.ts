import { Trigger } from ".";
import { CutsceneAction } from "../types";

export type TriggerConfig = {
    modelID: string,
    cutsceneAction: CutsceneAction,
}
export type MoveTriggerConfig = TriggerConfig & {
    dest: BasePart,
}

export type LookAtTriggerConfig = TriggerConfig & {
    lookAtActor: string,
}

export type TriggerMap = Array<TriggerPair>
export type TriggerPair = [number, Trigger];

