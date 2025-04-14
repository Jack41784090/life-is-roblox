import { TriggerMap } from "../Trigger/types";
import { CutsceneScriptConfig } from "./type";

export class CutsceneScript {
    private triggerMap: TriggerMap;

    constructor(config: CutsceneScriptConfig) {
        this.triggerMap = config.triggerMap;
    }

    public getSortedTriggerMap() {
        return this.triggerMap.sort((a, b) => {
            return a[0] - b[0] < 0;
        })
    }
}