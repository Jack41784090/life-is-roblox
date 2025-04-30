import { Atom, atom, subscribe } from "@rbxts/charm";
import { RunService, TweenService, Workspace } from "@rbxts/services";
import { portraitsFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { SpeechBubbleConfig, SpeechBubbleState } from "./types";

/**
 * SpeechBubble class for displaying interactive text bubbles with animations.
 * Used for character dialogue with typewriter text effect and smooth animations.
 */
export default class SpeechBubble {
    private logger = Logger.createContextLogger("SpeechBubble");
    private textAtom: Atom<string>;
    private stateAtom: Atom<SpeechBubbleState>;
    private container: Part;
    private billboardGui: BillboardGui;
    private bubbleFrame: Frame;
    private textLabel: TextLabel;
    private portrait?: ImageLabel;
    private displaySubscription?: () => void;
    private stateSubscription?: () => void;
    private ancestryChangedConnection?: RBXScriptConnection;
    private resolveFinished: (value: boolean) => void = () => { throw ("resolveFinished not set"); };
    private hasFinished = false;
    private finishedPromise: Promise<boolean>;
    private config: SpeechBubbleConfig;
    private connections: (() => void)[] = [];

    /**
     * Creates a new speech bubble attached to the specified parent
     * 
     * @param config Configuration for the speech bubble appearance and behavior
     */
    constructor(config: SpeechBubbleConfig) {
        this.config = this.normalizeConfig(config);
        this.textAtom = atom("");
        this.stateAtom = atom<SpeechBubbleState>(SpeechBubbleState.INITIALIZING);

        // Create container part
        this.container = this.createContainer(config.parent);

        // Create billboard GUI and UI components
        this.billboardGui = this.createBillboardGui();
        this.bubbleFrame = this.createBubbleFrame();
        this.textLabel = this.createTextLabel();
        this.addPointer();
        this.addCornerRadius();
        this.addStroke();
        if (config.portrait) {
            this.addPortrait();
        }

        // Set up reactive subscriptions
        this.setupSubscriptions();

        // Start the speech bubble lifecycle
        this.startLifecycle();

        // Create promise for tracking completion
        this.finishedPromise = new Promise<boolean>((resolve) => {
            this.resolveFinished = resolve;
        });

        // Add cleanup connections
        this.setupCleanupConnections();
    }

    private addPortrait(): void {
        const entityPortraitFolder = portraitsFolder.FindFirstChild(this.config.portrait!) as Folder;
        if (!entityPortraitFolder) {
            this.logger.error(`Portrait folder not found for ${this.config.portrait}`);
            return;
        }
        const portraitImage = entityPortraitFolder.FindFirstChild("neutral") as Decal;
        if (!portraitImage) {
            this.logger.error(`Neutral portrait image not found for ${this.config.portrait}`);
            return;
        }
        const id = portraitImage.Texture;

        this.portrait = new Instance("ImageLabel");
        this.portrait.Name = "Portrait";
        this.portrait.Size = UDim2.fromScale(0.3, 1);
        this.portrait.Position = UDim2.fromScale(0, 0);
        this.portrait.BackgroundTransparency = 1;
        this.portrait.Image = id;
        this.portrait.Parent = this.bubbleFrame;
        this.portrait.ScaleType = Enum.ScaleType.Crop;
    }

    /**
     * Normalize config with default values where needed
     */
    private normalizeConfig(config: SpeechBubbleConfig): SpeechBubbleConfig {
        return {
            ...config,
            parent: config.parent,
            message: config.message,
            backgroundColor: config.backgroundColor ?? Color3.fromRGB(255, 255, 255),
            textColor: config.textColor ?? Color3.fromRGB(0, 0, 0),
            typingSpeed: config.typingSpeed ?? 0.03,
            baseDisplayTime: config.baseDisplayTime ?? 1.5,
            extraTimePerChar: config.extraTimePerChar ?? 0.08
        };
    }

    /**
     * Create the container part positioned above the parent
     */
    private createContainer(parent: BasePart): Part {
        const container = new Instance("Part");
        container.Name = "SpeechBubbleContainer";
        container.Anchored = true;
        container.CanCollide = false;
        container.Size = new Vector3(4, 2, 0.1);
        container.Transparency = 1;

        // Position above the parent model's head
        const headOffset = new Vector3(0, 5, 0);
        container.Position = parent.Position.add(headOffset);
        container.Parent = Workspace;
        return container;
    }

    /**
     * Create the billboard GUI
     */
    private createBillboardGui(): BillboardGui {
        const gui = new Instance("BillboardGui");
        gui.Name = "SpeechBubbleGui";
        gui.Size = new UDim2(0, 400, 0, 100);
        gui.StudsOffset = new Vector3(0, 0, 0);
        gui.AlwaysOnTop = true;
        gui.Adornee = this.container;
        gui.Parent = this.container;
        return gui;
    }

    /**
     * Create the main bubble frame
     */
    private createBubbleFrame(): Frame {
        const frame = new Instance("Frame");
        frame.Name = "BubbleFrame";
        frame.Size = UDim2.fromScale(0, 0); // Start at size 0 for animation
        frame.Position = UDim2.fromScale(0.5, 0.5);
        frame.AnchorPoint = new Vector2(0.5, 0.5);
        frame.BackgroundColor3 = this.config.backgroundColor ?? Color3.fromRGB(255, 255, 255);
        frame.BackgroundTransparency = 0.5;
        frame.BorderSizePixel = 0;
        frame.Parent = this.billboardGui;
        return frame;
    }

    /**
     * Create the text label that displays the message
     */
    private createTextLabel(): TextLabel {
        const label = new Instance("TextLabel");
        label.Name = "SpeechText";
        label.Size = UDim2.fromScale(0.9, 0.8);
        label.Position = UDim2.fromScale(
            this.config.portrait ? 0.3 : 0.05
            , 0.45);
        label.AnchorPoint = new Vector2(0, 0.5);
        label.BackgroundTransparency = 1;
        label.TextColor3 = this.config.textColor ?? Color3.fromRGB(0, 0, 0);
        label.TextSize = 18;
        label.Font = Enum.Font.GothamMedium;
        label.TextWrapped = true;
        label.TextXAlignment = Enum.TextXAlignment.Left;
        label.TextYAlignment = Enum.TextYAlignment.Center;
        label.Text = "";
        label.Parent = this.bubbleFrame;
        return label;
    }

    /**
     * Add pointer to the speech bubble
     */
    private addPointer(): void {
        const pointer = new Instance("ImageLabel");
        pointer.Name = "Pointer";
        pointer.BackgroundTransparency = 1;
        pointer.Size = UDim2.fromScale(0.2, 0.2);
        pointer.Position = UDim2.fromScale(0.5, 1);
        pointer.AnchorPoint = new Vector2(0.5, 0);
        pointer.Image = "rbxassetid://172525946"; // Triangle shape
        pointer.ImageColor3 = this.config.backgroundColor ?? Color3.fromRGB(255, 255, 255);
        pointer.Parent = this.bubbleFrame;
    }

    /**
     * Add corner radius to the speech bubble
     */
    private addCornerRadius(): void {
        const corner = new Instance("UICorner");
        corner.CornerRadius = new UDim(0.05, 0);
        corner.Parent = this.bubbleFrame;
    }

    /**
     * Add stroke to the speech bubble
     */
    private addStroke(): void {
        const stroke = new Instance("UIStroke");
        stroke.Color = Color3.fromRGB(40, 40, 40);
        stroke.Thickness = 2;
        stroke.Parent = this.bubbleFrame;
    }

    /**
     * Set up reactive text subscriptions
     */
    private setupSubscriptions(): void {
        // Subscribe to text atom changes
        this.displaySubscription = subscribe(this.textAtom, (newText) => {
            this.textLabel.Text = newText;
        });

        // Subscribe to state changes
        this.stateSubscription = subscribe(this.stateAtom, (newState, oldState) => {
            this.logger.debug(`State changed: ${oldState} -> ${newState}`);

            if (newState === SpeechBubbleState.APPEARING) {
                this.appear();
            } else if (newState === SpeechBubbleState.TYPING) {
                this.startTyping();
            } else if (newState === SpeechBubbleState.DISPLAYING) {
                this.scheduleDisappearance();
            } else if (newState === SpeechBubbleState.DISAPPEARING) {
                this.disappear();
            } else if (newState === SpeechBubbleState.DESTROYED) {
                this.cleanup();
            }
        });
    }

    /**
     * Set up connections for cleanup
     */
    private setupCleanupConnections(): void {
        // Monitor ancestry changes to detect if container is removed from workspace
        this.ancestryChangedConnection = this.container.AncestryChanged.Connect(() => {
            if (!this.container.IsDescendantOf(game)) {
                this.cleanup();
                this.resolveFinished?.(false);
            }
        });

        // Add connection to connections array
        this.connections.push(() => {
            this.ancestryChangedConnection?.Disconnect();
        });

        // Add connection to monitor parent
        const parentChangeConnection = RunService.RenderStepped.Connect(() => {
            // Update speech bubble position to match parent position if parent changes position
            if (this.config.parent && this.config.parent.Parent) {
                const headOffset = new Vector3(0, 5, 0);
                this.container.Position = this.config.parent.Position.add(headOffset);
            } else if (this.config.parent && !this.config.parent.Parent) {
                // Parent was removed, clean up the speech bubble
                this.cleanup();
                this.resolveFinished(false);
            }
        });

        this.connections.push(() => {
            parentChangeConnection.Disconnect();
        });
    }

    /**
     * Start the speech bubble lifecycle
     */
    private startLifecycle(): void {
        this.stateAtom(SpeechBubbleState.APPEARING);
    }

    /**
     * Animate the bubble appearing
     */
    private appear(): void {
        const appearTween = TweenService.Create(
            this.bubbleFrame,
            new TweenInfo(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
            { Size: UDim2.fromScale(1, 1) }
        );

        appearTween.Completed.Connect(() => {
            this.stateAtom(SpeechBubbleState.TYPING);
        });

        appearTween.Play();
    }

    /**
     * Start typewriter effect for text display
     */
    private startTyping(): void {
        const characters = this.config.message.split("");
        let currentText = "";

        const typeText = () => {
            let i = 0;
            const typeChar = () => {
                if (i < characters.size()) {
                    currentText += characters[i];
                    this.textAtom(currentText);
                    i++;

                    // Schedule next character
                    task.delay(this.config.typingSpeed ?? 0.15, typeChar);
                } else {
                    // All characters have been typed
                    this.stateAtom(SpeechBubbleState.DISPLAYING);
                }
            };

            typeChar();
        };

        typeText();
    }

    /**
     * Schedule the disappearance of the speech bubble
     */
    private scheduleDisappearance(): void {
        // Calculate display duration based on message length
        const displayDuration = this.config.baseDisplayTime ?? 1.5 +
            (this.config.message.size() * (this.config.extraTimePerChar ?? 0.08));

        task.delay(displayDuration, () => {
            if (!this.hasFinished) {
                this.stateAtom(SpeechBubbleState.DISAPPEARING);
            }
        });
    }

    /**
     * Animate the speech bubble disappearing
     */
    private disappear(): void {
        const disappearTween = TweenService.Create(
            this.bubbleFrame,
            new TweenInfo(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.In),
            { Size: UDim2.fromScale(0, 0), BackgroundTransparency: 1 }
        );

        disappearTween.Completed.Connect(() => {
            this.stateAtom(SpeechBubbleState.DESTROYED);
        });

        disappearTween.Play();
    }

    /**
     * Clean up resources and complete the speech bubble lifecycle
     */
    public cleanup(): void {
        if (this.hasFinished) return;

        this.hasFinished = true;

        // Disconnect all subscriptions and connections
        if (this.displaySubscription) this.displaySubscription();
        if (this.stateSubscription) this.stateSubscription();

        this.connections.forEach(conn => conn());
        this.connections.clear();

        // Clean up instances
        if (this.container && this.container.Parent) {
            this.container.Destroy();
        }

        // Resolve the finished promise if not already resolved
        this.resolveFinished(true);
    }

    /**
     * Force the speech bubble to close early
     */
    public close(): void {
        if (!this.hasFinished) {
            this.stateAtom(SpeechBubbleState.DISAPPEARING);
        }
    }

    /**
     * Get the finished promise
     */
    public finished(): Promise<boolean> {
        return this.finishedPromise;
    }

    /**
     * Get the text atom
     */
    public getTextAtom(): Atom<string> {
        return this.textAtom;
    }

    /**
     * Get the state atom
     */
    public getStateAtom(): Atom<SpeechBubbleState> {
        return this.stateAtom;
    }

    /**
     * Get the container part
     */
    public getContainer(): Part {
        return this.container;
    }
}