import { RunService } from "@rbxts/services";
import { scenesFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { ActorManager } from "./ActorManager";
import { CameraManager } from "./CameraManager";
import { CutsceneScript } from "./Script";
import { CutsceneConfig } from "./Script/type";
import { CutsceneSet } from "./Set";
import { LookAtTrigger, Trigger } from "./Trigger";
import { TriggerPair } from "./Trigger/types";
import { TriggerFactory } from "./TriggerFactory";
import { TriggerManager } from "./TriggerManager";

/**
 * Main Cutscene class responsible for coordinating the cutscene playback
 * Uses composition over inheritance by delegating responsibilities to specialized classes
 */
export class Cutscene {
    // Component instances (using composition)
    private logger = Logger.createContextLogger("Cutscene");
    private triggerFactory = new TriggerFactory();
    private triggerManager = new TriggerManager();
    private actorManager = new ActorManager();
    private cameraManager: CameraManager;

    // Core cutscene components
    private script: CutsceneScript;
    private cutsceneSet: CutsceneSet;

    // Runtime state
    private runtime?: RBXScriptConnection;
    private cameraControl?: RBXScriptConnection;
    private elapsedTime: number = -1;

    // Camera state
    private cameraAngle: number = 0;
    private cameraEnabled: boolean = true;
    private cameraMode: "FREE" | "LOCKED" | "FOLLOWING" = "FREE";

    // Model references
    private modelName: string;
    private model: Model;

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

        // Initialize camera manager
        this.cameraManager = new CameraManager(this);
    }

    //#region Initialisations
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

    private initializeCamera() {
        this.logger.info("Initializing camera");
        this.cameraManager.initialize();

        // Initialize camera for cutscene playback
        this.initializeCamera = () => {
            this.logger.info("Camera already initialized");
        };
    }

    public getModel(): Model {
        return this.model;
    }

    //#endregion

    //#region Validations
    /**
     * Check if a specific trigger has been activated
     */
    public isXTriggerActivated(triggerName: string): boolean {
        return this.triggerManager.isTriggerActivated(triggerName);
    }
    //#endregion

    //#region Cutscene playback
    /**
     * Play the cutscene from the beginning
     */
    public playFromStart(): void {
        this.logger.info("Playing cutscene from start");

        // Clean up any existing runtime
        this.stopCutscene();

        // Initialize camera
        this.initializeCamera();

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

            // Check if there are no more triggers to process
            if (!nextTriggerPair) {
                // triggers done, schedule stopcutscene
                this.logger.info("All triggers finished");
                (Promise.all(this.triggerManager.getAllTriggers().map(trigger => trigger[1].finished ? Promise.resolve() :
                    new Promise(resolve => {
                        const checkTriggered = RunService.RenderStepped.Connect(() => {
                            if (trigger[1].finished) {
                                checkTriggered.Disconnect();
                                resolve(void 0);
                            }
                        });
                    })
                ))).then(() => {
                    this.stopCutscene();
                })
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
        this.cameraManager.cleanup();
        this.elapsedTime = -1;
    }
    //#endregion

    //#region Getting cutscene components
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
    //#endregion

    //#region Trigger handling
    public handleLookAtTrigger(trigger: LookAtTrigger): Promise<void> {
        if (trigger.modelID === "camera") {
            return this.cameraManager.handleLookAt(trigger);
        }

        return Promise.resolve();
    }

    // Method to reset camera control after a LookAt trigger
    public releaseCameraAfterTrigger(): void {
        if (this.cameraManager) {
            this.cameraManager.releaseCameraControl();
        }
    }
    //#endregion
}