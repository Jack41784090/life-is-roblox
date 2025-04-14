import { RunService } from "@rbxts/services";
import { modelFolder } from "shared/const/assets";
import { PlaceConfig } from "shared/types/explorer-types";
import Logger from "shared/utils/Logger";
import C from "../explorer/C";
import { CConfig } from "../explorer/C/types";
import Place from "../explorer/Place";

export enum CutsceneAction {
    idle,
    action1,
    action2,
}
type CutsceneScriptConfig = {
    triggerMap: TriggerMap,
}

type TriggerPair = [number, Trigger];
export type TriggerMap = Array<TriggerPair>

export class Trigger {
    constructor(
        public modelID: string,
        public cutsceneAction: CutsceneAction,
        public activated: boolean,
        public finished: boolean,
    ) {

    }
}

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

type Prop = {
    location: Vector3,
    modelID: string,
}

type SetConfig = PlaceConfig;
type ActorConfig = CConfig & Prop & {
    set: Set;
};

class Set extends Place {
    constructor(config: SetConfig) {
        super(config);
    }
}

class Actor extends C {
    constructor(actorConfig: ActorConfig) {
        super(actorConfig, actorConfig.set);
    }
}

export class CutsceneSet {
    private logger = Logger.createContextLogger("CutsceneSet")
    constructor(
        public setting: Prop,
        public actors: Actor[],
        public props: Prop[],
    ) {

    }

    private getModel(id: string) {
        return modelFolder.FindFirstChild(id);
    }

    public getActor(targetedModel: string) {
        return this.actors.find(a => a.getModelID() === targetedModel);
    }
}

type CutsceneConfig = {
    script: CutsceneScript;
    set: CutsceneSet;
}

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