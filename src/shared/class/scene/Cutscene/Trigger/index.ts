import Logger, { ContextLogger } from "shared/utils/Logger";
import { CutsceneActor, CutsceneSet } from "../Set";
import { LookAtTriggerConfig, MoveTriggerConfig, TriggerConfig } from "./types";


export class Trigger {
    protected logger: ContextLogger;
    public activated: boolean = false;
    public finished: boolean = false;
    public modelID: string;

    constructor(config: TriggerConfig) {
        this.modelID = config.modelID;
        this.logger = Logger.createContextLogger(`Trigger(${this.modelID})`);
    }

    public run(cutsceneSet: CutsceneSet) {
        // Implement the logic for what happens when the trigger is activated
        // This could be a function that is called when the trigger is activated
        // For example, you could call a method on the model to make it do something
        // or you could change the state of the cutscene
        this.activated = true;


        const actor = this.modelID === "camera" ?
            cutsceneSet.getCamera() :
            cutsceneSet.getActor(this.modelID);
        if (!actor) {
            this.logger.error("No actor found with id", this.modelID);
            return;
        }

        return actor;
    }
}

export class MoveTrigger extends Trigger {
    public dest: BasePart;
    constructor(config: MoveTriggerConfig) {
        super(config);
        this.dest = config.dest;
    }

    public run(cutsceneSet: CutsceneSet) {
        const actor = super.run(cutsceneSet);
        if (!actor) return;

        this.logger.debug(`Moving to ${this.dest.Position}`);

        if (actor instanceof CutsceneActor) {
            actor.setDestination(this.dest.Position);
        }
        else {
            actor.CFrame = this.dest.CFrame;
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

    public run(cutsceneSet: CutsceneSet) {
        const actor = super.run(cutsceneSet);
        if (!actor) return;

        this.logger.debug(`Looking at ${this.lookAtActor}`);
        const lookAt = cutsceneSet.getAny(this.lookAtActor);
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

        return actor;
    }
}
