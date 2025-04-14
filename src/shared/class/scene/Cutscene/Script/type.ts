import { CutsceneScript } from ".";
import { CutsceneSet } from "../Set";
import { TriggerMap } from "../Trigger/types";

export type CutsceneScriptConfig = {
    triggerMap: TriggerMap,
}

export type CutsceneConfig = {
    script: CutsceneScript;
    set: CutsceneSet;
}