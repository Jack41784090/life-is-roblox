import { RunService } from "@rbxts/services";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { Cutscene } from "..";
import { CutsceneActor } from "../Set";
import { LookAtTriggerConfig, MoveTriggerConfig, SpeakConfig, TriggerConfig } from "./types";


export class Trigger {
    public readonly name: string;
    protected logger: ContextLogger;
    public activated: boolean = false;
    public finished: boolean = false;
    public modelID: string;
    public triggersAfter?: string;
    public delay = 0;

    constructor(config: TriggerConfig) {
        this.logger = Logger.createContextLogger(`Trigger(${config.modelID})`);
        this.modelID = config.modelID;
        this.triggersAfter = config.triggersAfter;
        this.name = config.name;
        this.delay = config.delay ?? 0;
    }

    public async run(cutscene: Cutscene): Promise<Camera | CutsceneActor | undefined> {
        // Implement the logic for what happens when the trigger is activated
        // This could be a function that is called when the trigger is activated
        // For example, you could call a method on the model to make it do something
        // or you could change the state of the cutscene
        this.activated = true;
        const actor = this.modelID === "camera" ?
            cutscene.getCamera() :
            cutscene.getActor(this.modelID); if (!actor) {
                this.logger.error(`[ACTOR_NOT_FOUND] Failed to retrieve actor with ID "${this.modelID}" for trigger "${this.name}"`);
                return;
            }

        return this.triggersAfter ?
            new Promise(resolve => {
                const checkTriggered = RunService.RenderStepped.Connect(() => {
                    if (cutscene.isXTriggerActivated(this.triggersAfter!)) {
                        checkTriggered.Disconnect();
                        wait(this.delay)
                        resolve(actor);
                    }
                })
            }) :
            actor;
    }
}

export class MoveTrigger extends Trigger {
    public dest: BasePart;
    constructor(config: MoveTriggerConfig) {
        super(config);
        this.dest = config.dest;
    }
    public async run(cutscene: Cutscene) {
        const actor = await super.run(cutscene);
        if (!actor) return;

        if (actor instanceof CutsceneActor) {
            actor.setDestination(this.dest.Position).then(() => {
                this.finished = true;
            });
        }
        else {
            actor.CFrame = this.dest.CFrame;
            this.finished = true;
        }

        return actor;
    }
}

export class LookAtTrigger extends Trigger {
    public lookAtActor: string;
    constructor(config: LookAtTriggerConfig) {
        super(config);
        this.lookAtActor = config.lookAtActor;
    }
    public async run(cutscene: Cutscene) {
        const actor = await super.run(cutscene);
        if (!actor) return;

        const lookAt = cutscene.getAny(this.lookAtActor);
        if (!lookAt) {
            this.logger.error("No actor found with id", this.lookAtActor);
            return;
        }

        const lookAtPosition = lookAt instanceof CutsceneActor ?
            lookAt.getModel().GetPivot().Position :
            lookAt.CFrame.Position;
        if (actor instanceof CutsceneActor) {
            actor.lookAt(lookAtPosition);
        }
        else {
            actor.CFrame = CFrame.lookAt(actor.CFrame.Position, lookAtPosition);
        }

        this.finished = true;
        return actor;
    }
}

export class SpeakTrigger extends Trigger {
    public text: string;
    constructor(config: SpeakConfig) {
        super(config);
        this.text = config.text;
    }
    public async run(cutscene: Cutscene) {
        const actor = await super.run(cutscene);
        if (!actor) return;

        if (actor instanceof CutsceneActor) {
            actor.speak(this.text).then(() => {
                this.finished = true;
            });
        }
        else {
            this.logger.error("Actor is not a CutsceneActor", actor);
            return;
        }

        return actor;
    }
}
