import { RunService } from "@rbxts/services";
import Logger from "shared/utils/Logger";
import { CutsceneScript } from "./Script";
import { CutsceneConfig } from "./Script/type";
import { CutsceneSet } from "./Set";
import { Trigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";

export class Cutscene {
    private logger = Logger.createContextLogger("Cutscene")
    private script: CutsceneScript;
    private runtime?: RBXScriptConnection;
    private elapsedTime: number = -1;
    private cutsceneSet: CutsceneSet;

    constructor(config: CutsceneConfig) {
        this.script = config.script;
        this.cutsceneSet = config.set;
    }

    public playFromStart() {
        this.logger.info(`Playing cutscene from start`)
        this.runtime?.Disconnect();
        this.elapsedTime = 0;
        const triggers = this.script.getSortedTriggerMap();
        this.logger.debug("Sorted triggers", triggers)

        let nextTriggerPair: TriggerPair | undefined = triggers.shift();

        this.runtime = RunService.RenderStepped.Connect(dt => {
            if (dt > .5) {
                this.logger.warn("LAGSPIKE: ", dt);
                // skip lag spike updates
                return;
            }


            this.elapsedTime += dt;
            nextTriggerPair = nextTriggerPair || triggers.shift();
            this.logger.debug(`[${math.floor(this.elapsedTime)}s ${this.elapsedTime % 1}ms]`, nextTriggerPair);
            if (!nextTriggerPair) {
                this.stopCutscene();
                return;
            }

            const time = nextTriggerPair[0];
            const trigger = nextTriggerPair[1];
            if (time > this.elapsedTime) {
                // wait for trigger to reach required time
                return;
            }
            else if (time < this.elapsedTime && trigger.activated) {
                nextTriggerPair = undefined;
                return;
            }

            this.runTrigger(trigger);
        })
    }

    public stopCutscene() {
        this.logger.info("Cutscene is stopped.")
        this.runtime?.Disconnect();
        this.elapsedTime = -1;
    }

    private runTrigger(trigger: Trigger) {
        this.logger.info(`Running Trigger`, trigger);
        trigger.activated = true;

        const targetedModel = trigger.modelID;
        const actor = this.cutsceneSet.getActor(targetedModel);
        if (!actor) {
            this.logger.error("No actor found with id", targetedModel);
            return;
        }

        actor
    }
}