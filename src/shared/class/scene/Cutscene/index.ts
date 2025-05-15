import { RunService } from "@rbxts/services";
import { scenesFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { ActorManager } from "./ActorManager";
import { CutsceneScript } from "./Script";
import { CutsceneConfig } from "./Script/type";
import { CutsceneSet } from "./Set";
import { Trigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";
import { TriggerFactory } from "./TriggerFactory";
import { TriggerManager } from "./TriggerManager";

/**
 * Main Cutscene class responsible for coordinating the cutscene playback
 * Uses composition over inheritance by delegating responsibilities to specialized classes
 */
export class Cutscene {
    // Accessor methods for external components
    public getAny(lookAtActor: string) {
        return this.cutsceneSet.getAny(lookAtActor);
    }

    public getActor(modelID: string) {
        return this.cutsceneSet.getActor(modelID);
    }

    public getCamera() {
        return this.cutsceneSet.getCamera();
    }

    // Component instances (using composition)
    private logger = Logger.createContextLogger("Cutscene");
    private triggerFactory = new TriggerFactory();
    private triggerManager = new TriggerManager();
    private actorManager = new ActorManager();

    // Core cutscene components
    private script: CutsceneScript;
    private cutsceneSet: CutsceneSet;

    // Runtime state
    private runtime?: RBXScriptConnection;
    private elapsedTime: number = -1;

    // Model references
    private modelName: string;
    private model: Model;

    /**
     * Initialize character movement triggers from the scene model
     * @returns Array of trigger pairs for character movements
     */
    private initializeCharacterTriggers(): [number, Trigger][] {
        this.logger.info("Initializing character move triggers");
        const scriptObj = this.model.WaitForChild("Script") as Model;
        const charMoves = scriptObj.WaitForChild("CharMoves") as Model;

        const triggers: [number, Trigger][] = [];

        charMoves.GetDescendants().forEach(descendant => {
            const actor = descendant.FindFirstChild('actor') as StringValue;
            const time = descendant.FindFirstChild('time') as NumberValue;
            const delay = descendant.FindFirstChild('delay') as NumberValue;
            const triggersAfter = descendant.FindFirstChild('triggersAfter') as StringValue;
            const lookAt = descendant.FindFirstChild('lookAt') as StringValue;
            const text = descendant.FindFirstChild('text') as StringValue;

            if (!time || !actor) return;

            // Register the trigger in the manager
            this.triggerManager.registerTrigger(descendant.Name);

            if (descendant.IsA('BasePart')) {
                // Handle position triggers (BasePart)
                if (time.Value === 0) {
                    this.actorManager.setActorInitPosition(actor.Value, descendant.Position);
                }

                triggers.push(
                    this.triggerFactory.createMoveTrigger(
                        time.Value,
                        descendant,
                        actor.Value,
                        descendant.Name,
                        triggersAfter?.Value,
                        delay?.Value
                    )
                );
            } else if (descendant.IsA('StringValue')) {
                // Handle other trigger types (LookAt, Speak)
                switch (descendant.Value) {
                    case 'LookAt':
                        if (lookAt) {
                            triggers.push(
                                this.triggerFactory.createLookAtTrigger(
                                    time.Value,
                                    descendant.Name,
                                    actor.Value,
                                    lookAt.Value,
                                    triggersAfter?.Value,
                                    delay?.Value
                                )
                            );
                        }
                        break;
                    case 'Speak':
                        if (text) {
                            triggers.push(
                                this.triggerFactory.createSpeakTrigger(
                                    time.Value,
                                    descendant.Name,
                                    actor.Value,
                                    text.Value,
                                    triggersAfter?.Value,
                                    delay?.Value
                                )
                            );
                        }
                        break;
                }
            }
        });

        return triggers;
    }

    /**
     * Initialize camera movement triggers from the scene model
     * @returns Array of trigger pairs for camera movements
     */
    private initializeCameraTriggers(): [number, Trigger][] {
        this.logger.info("Initializing camera move triggers");
        const scriptObj = this.model.WaitForChild("Script") as Model;
        const camMoves = scriptObj.WaitForChild("CamMoves") as Model;

        const triggers: [number, Trigger][] = [];

        camMoves.GetDescendants().forEach(descendant => {
            if (!descendant.IsA('BasePart')) return;

            const timeValue = descendant.FindFirstChildWhichIsA('NumberValue');
            if (!timeValue) return;

            // Register the trigger in the manager
            this.triggerManager.registerTrigger(descendant.Name);

            triggers.push(
                this.triggerFactory.createCameraMoveTrigger(
                    timeValue.Value,
                    descendant,
                    descendant.Name
                )
            );
        });

        return triggers;
    }

    /**
     * Main constructor for the Cutscene class
     */
    constructor(config: CutsceneConfig) {
        this.logger.info("Creating cutscene", config);

        // Initialize scene model
        this.modelName = config.sceneModel;
        const scene = scenesFolder.WaitForChild(this.modelName) as Model;
        if (!scene) {
            this.logger.error("Scene model not found in folder", this.modelName);
            throw `Scene model not found in folder ${this.modelName}`;
        }
        this.model = scene.Clone();

        // Initialize triggers and actors
        const characterTriggers = this.initializeCharacterTriggers();
        const cameraTriggers = this.initializeCameraTriggers();
        const actorConfigs = this.actorManager.getActorConfigs();

        // Combine all triggers
        const allTriggers: TriggerPair[] = [...config.triggerMap, ...characterTriggers, ...cameraTriggers];

        // Initialize script and set
        this.script = new CutsceneScript({
            triggerMap: allTriggers,
        });

        this.cutsceneSet = new CutsceneSet({
            cutsceneModel: this.model,
            centreOfScene: config.centreOfScene,
            actors: actorConfigs,
        });
    }

    /**
     * Check if a specific trigger has been activated
     */
    public isXTriggerActivated(triggerName: string): boolean {
        return this.triggerManager.isTriggerActivated(triggerName);
    }

    /**
     * Play the cutscene from the beginning
     */
    public playFromStart(): void {
        this.logger.info("Playing cutscene from start");

        // Clean up any existing runtime
        this.stopCutscene();

        // Initialize playback state
        this.elapsedTime = 0;
        const triggers = this.script.getSortedTriggerMap();
        this.logger.debug("Sorted triggers", triggers);

        let nextTriggerPair: TriggerPair | undefined = triggers.shift();
        this.cutsceneSet.show();

        // Start the runtime loop
        this.runtime = RunService.RenderStepped.Connect(dt => {
            if (dt > 0.5) {
                this.logger.warn("Performance issue detected (lag spike):", dt);
                return; // Skip lag spike updates
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
                // Wait for trigger to reach required time
                return;
            } else if (time < this.elapsedTime && trigger.activated) {
                // Move to next trigger if current one is already activated
                nextTriggerPair = undefined;
                return;
            }

            // Execute the trigger
            this.triggerManager.executeTrigger(nextTriggerPair, this);
        });
    }

    /**
     * Stop the cutscene and clean up
     */
    public stopCutscene(): void {
        this.logger.info("Stopping cutscene");
        this.runtime?.Disconnect();
        this.elapsedTime = -1;
    }
}