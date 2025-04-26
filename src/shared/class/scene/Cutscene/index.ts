import { RunService, Workspace } from "@rbxts/services";
import { scenesFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { CutsceneScript } from "./Script";
import { CutsceneConfig } from "./Script/type";
import { CutsceneSet } from "./Set";
import { MoveTrigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";
import { ActorConfig, CutsceneAction } from "./types";

export class Cutscene {
    getAny(lookAtActor: string) {
        return this.cutsceneSet.getAny(lookAtActor);
    }
    getActor(modelID: string) {
        return this.cutsceneSet.getActor(modelID);
    }
    getCamera() {
        return this.cutsceneSet.getCamera();
    }
    private logger = Logger.createContextLogger("Cutscene")

    private triggeredMap: Map<string, boolean> = new Map<string, boolean>();
    private script: CutsceneScript;
    private cutsceneSet: CutsceneSet;

    private runtime?: RBXScriptConnection;
    private elapsedTime: number = -1;

    private modelName: string;
    private model?: Model;
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
            config.triggerMap.push([t.Value, new MoveTrigger({
                modelID: dd.Value,
                cutsceneAction: CutsceneAction.Move,
                dest: d,
                name: d.Name,
            })] as TriggerPair);
            this.triggeredMap.set(d.Name, false);
            return d;
        });
        const camMovesDescendants = this.camMoves.GetDescendants().mapFiltered(d => {
            if (!d.IsA('BasePart')) return;
            const t = d.FindFirstChildWhichIsA('NumberValue');
            if (!t) return;
            config.triggerMap.push([t.Value, new MoveTrigger({
                modelID: 'camera',
                cutsceneAction: CutsceneAction.Move,
                dest: d,
                name: d.Name,
            })] as TriggerPair);
            this.triggeredMap.set(d.Name, false);
            return d;
        })
        const actorshells: ActorConfig[] = [];
        starInitPosition.forEach((pos, actorName) => {
            const actor = {
                id: actorName,
                displayName: actorName,
                spawnLocation: pos,
            }
            actorshells.push(actor);
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

    public isXTriggerActivated(triggerName: string) {
        const trigger = this.triggeredMap.get(triggerName);
        if (trigger === undefined) {
            this.logger.error("Trigger not found", triggerName);
            return false;
        }
        return trigger;
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

        // For time=0 MoveTrigger, handle with immediate positioning instead of pathfinding
        if (time === 0 && trigger instanceof MoveTrigger) {
            if (trigger.modelID === 'camera') {
                // Handle camera immediate positioning
                Workspace.CurrentCamera!.CFrame = trigger.dest.CFrame;
            } else {
                // Handle actor immediate positioning
                const actor = this.cutsceneSet.getActor(trigger.modelID);
                if (actor) {
                    actor.getModel().PivotTo(trigger.dest.CFrame);
                } else {
                    this.logger.error("No actor found with id", trigger.modelID);
                }
            }
            trigger.activated = true;
            trigger.finished = true;
        }
        // For all other triggers or non-zero time triggers, use the OOP approach
        else {
            trigger.run(this);
        }

        const checkFinish = RunService.RenderStepped.Connect(() => {
            if (trigger.finished) {
                this.triggeredMap.set(trigger.name, true);
                this.logger.info(`Trigger ${trigger.name} finished`);
                checkFinish.Disconnect();
            }
        })
    }
}