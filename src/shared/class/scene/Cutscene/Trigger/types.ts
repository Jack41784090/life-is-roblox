import { Trigger } from ".";

export type TriggerMap = Array<TriggerPair>
export type TriggerPair = [number, Trigger | MoveTrigger];
export type MoveTrigger = {
    modelID: string,
    dest: BasePart,
    activated: boolean,
    finished: boolean,
}

