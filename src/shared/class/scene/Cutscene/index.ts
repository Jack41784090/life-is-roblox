import { RunService, Workspace } from "@rbxts/services";
import { scenesFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { CutsceneScript } from "./Script";
import { CutsceneConfig } from "./Script/type";
import { CutsceneSet } from "./Set";
import { Trigger } from "./Trigger";
import { MoveTrigger, TriggerPair } from "./Trigger/types";
import { ActorConfig } from "./types";

export class Cutscene {
    private modelName: string;
    private model?: Model;
    private logger = Logger.createContextLogger("Cutscene")
    private script: CutsceneScript;
    private runtime?: RBXScriptConnection;
    private elapsedTime: number = -1;
    private cutsceneSet: CutsceneSet;
    private camMoves: Model;
    private charMoves: Model;

    constructor(config: CutsceneConfig) {
        this.logger.info("Cutscene created", config);

        this.modelName = config.sceneModel;

        const cutsceneModel = this.createModel();
        const scriptObj = cutsceneModel.WaitForChild("Script") as Model;
        this.camMoves = scriptObj.WaitForChild("CamMoves") as Model;
        this.charMoves = scriptObj.WaitForChild("CharMoves") as Model;
        const starInitPosition = new Map<string, Vector3>();
        const charMovesDescendants = this.charMoves.GetDescendants().mapFiltered(d => {
            if (!d.IsA('BasePart')) return;
            const dd = d.FindFirstChildWhichIsA('StringValue');
            const t = d.FindFirstChildWhichIsA('NumberValue');
            if (!t || !dd) return;
            if (t.Value === 0) starInitPosition.set(dd.Value, d.Position);
            return d;
        });
        const camMovesDescendants = this.camMoves.GetDescendants();
        const actorshells: ActorConfig[] = [];
        starInitPosition.forEach((pos, actorName) => {
            const actor = {
                id: actorName,
                displayName: actorName,
                spawnLocation: pos,
            }
            actorshells.push(actor);
        })

        camMovesDescendants.forEach(d => {
            if (!d.IsA('BasePart')) {
                d.Destroy();
                return;
            }
            const t = d.FindFirstChildWhichIsA('NumberValue');
            if (!t) {
                d.Destroy();
                return;
            }
            config.triggerMap.push([t.Value, {
                modelID: 'camera',
                activated: false,
                dest: d,
            }] as TriggerPair);
        });
        charMovesDescendants.forEach(d => {
            const dd = d.FindFirstChildWhichIsA('StringValue')!;
            const t = d.FindFirstChildWhichIsA('NumberValue')!;
            config.triggerMap.push([t.Value, {
                modelID: dd.Value,
                activated: false,
                dest: d,
            } as MoveTrigger] as TriggerPair);
        })
        this.script = new CutsceneScript({
            triggerMap: config.triggerMap,
        })
        this.cutsceneSet = new CutsceneSet({
            cutsceneModel: cutsceneModel,
            centreOfScene: config.centreOfScene,
            actors: actorshells,
        })
    }

    public createModel() {
        const scene = scenesFolder.WaitForChild(this.modelName) as Model;
        if (!scene) {
            this.logger.error("Scene model not found in folder", this.modelName);
            throw `Scene model not found in folder ${this.modelName}`;
        }
        this.model = scene.Clone();
        return this.model;
    }

    public playFromStart() {
        this.logger.info(`Playing cutscene from start`)
        this.runtime?.Disconnect();
        this.elapsedTime = 0;
        const triggers = this.script.getSortedTriggerMap();
        this.logger.debug("Sorted triggers", triggers)

        let nextTriggerPair: TriggerPair | undefined = triggers.shift();
        this.cutsceneSet.show();
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

            this.runTrigger(nextTriggerPair);
        })
    }

    public stopCutscene() {
        this.logger.info("Cutscene is stopped.")
        this.runtime?.Disconnect();
        this.elapsedTime = -1;
    }

    private runTrigger(triggerPair: TriggerPair) {
        const time = triggerPair[0];
        const trigger = triggerPair[1];
        this.logger.info(`Running Trigger`, trigger);
        trigger.activated = true;

        const targetedModel = trigger.modelID;
        if (targetedModel === 'camera') {
            const mTrigger = trigger as MoveTrigger;
            const nTrigger = trigger as Trigger;
            if (mTrigger.dest) {
                Workspace.CurrentCamera!.CFrame = mTrigger.dest.CFrame;
            }
            else {
                // 
            }
        }
        else {
            const actor = this.cutsceneSet.getActor(targetedModel);
            if (!actor) {
                this.logger.error("No actor found with id", targetedModel);
                return;
            }
            const mTrigger = trigger as MoveTrigger;
            const nTrigger = trigger as Trigger;
            if (mTrigger.dest) {
                if (time === 0) {
                    actor.getModel().PivotTo(mTrigger.dest.CFrame);
                }
                else {
                    actor.setDestination(mTrigger.dest.Position);
                }
            }
            else {
                // 
            }
        }
    }
}