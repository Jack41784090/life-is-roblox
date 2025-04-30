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
    private model: Model;

    private initialiseCharMoveTriggers(starInitPosition: Map<string, Vector3>) {
        this.logger.info("Initialising camera and character move parts")
        const scriptObj = this.model.WaitForChild("Script") as Model;
        const charMoves = scriptObj.WaitForChild("CharMoves") as Model;
        const newMoveTriggers = charMoves.GetDescendants().mapFiltered(d => {
            if (!d.IsA('BasePart')) return;
            const actor = d.FindFirstChild('actor') as StringValue;
            const time = d.FindFirstChild('time') as NumberValue;
            const delay = d.FindFirstChild('delay') as NumberValue;
            const triggersAfter = d.FindFirstChild('triggersAfter') as StringValue;
            if (!time || !actor) return;
            if (time.Value === 0) starInitPosition.set(actor.Value, d.Position);
            this.triggeredMap.set(d.Name, false);
            return [time.Value, new MoveTrigger({
                modelID: actor.Value,
                cutsceneAction: CutsceneAction.Move,
                dest: d,
                name: d.Name,
                triggersAfter: triggersAfter?.Value,
                delay: delay?.Value,
            })] as TriggerPair;
        });

        return newMoveTriggers;
    }

    private initialiseCamMoveTriggers() {
        this.logger.info("Initialising camera move parts")
        const scriptObj = this.model.WaitForChild("Script") as Model;
        const camMoves = scriptObj.WaitForChild("CamMoves") as Model;
        const camMovesDescendants = camMoves.GetDescendants().mapFiltered(d => {
            if (!d.IsA('BasePart')) return;
            const t = d.FindFirstChildWhichIsA('NumberValue');
            if (!t) return;
            this.triggeredMap.set(d.Name, false);
            return [t.Value, new MoveTrigger({
                modelID: 'camera',
                cutsceneAction: CutsceneAction.Move,
                dest: d,
                name: d.Name,
            })] as TriggerPair;
        })

        return camMovesDescendants;
    }

    constructor(config: CutsceneConfig) {
        this.logger.info("Cutscene created", config);

        this.modelName = config.sceneModel;
        const scene = scenesFolder.WaitForChild(this.modelName) as Model;
        if (!scene) {
            this.logger.error("Scene model not found in folder", this.modelName);
            throw `Scene model not found in folder ${this.modelName}`;
        }
        this.model = scene.Clone();

        const actorshells: ActorConfig[] = [];
        const starInitPosition = new Map<string, Vector3>();
        const moveTriggers = this.initialiseCharMoveTriggers(starInitPosition);
        const camMoveTriggers = this.initialiseCamMoveTriggers();
        starInitPosition.forEach((pos, actorName) => {
            const actor = {
                id: actorName,
                displayName: actorName,
                spawnLocation: pos,
            }
            actorshells.push(actor);
        })

        const allMoveTriggers: TriggerPair[] = config.triggerMap;
        moveTriggers.forEach(mt => allMoveTriggers.push(mt));
        camMoveTriggers.forEach(mt => allMoveTriggers.push(mt));

        this.script = new CutsceneScript({
            triggerMap: allMoveTriggers,
        })
        this.cutsceneSet = new CutsceneSet({
            cutsceneModel: this.model,
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

    private handleImmediateMoveTrigger(trigger: MoveTrigger) {
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

    private runTrigger(triggerPair: TriggerPair) {
        const time = triggerPair[0];
        const trigger = triggerPair[1];
        this.logger.info(`Running Trigger`, trigger);

        // For time=0 MoveTrigger, handle with immediate positioning instead of pathfinding
        if (time === 0 && trigger instanceof MoveTrigger) {
            this.handleImmediateMoveTrigger(trigger)
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