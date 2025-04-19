import { TriggerMap } from "../Trigger/types";

export type CutsceneScriptConfig = {
    triggerMap: TriggerMap,
}

export type CutsceneConfig = {
    centreOfScene: Vector3;
    triggerMap: TriggerMap;
    sceneModel: string;
}