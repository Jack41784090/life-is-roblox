import React, { useEffect, useRef, useState } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { RunService, Workspace } from "@rbxts/services";
import { portraitsFolder } from "shared/const/assets";
import Logger from "shared/utils/Logger";
import { SpeechBubbleConfig, SpeechBubbleState } from "./types";

/**
 * SpeechBubble component for displaying interactive text bubbles with animations.
 * Used for character dialogue with typewriter text effect and smooth animations.
 */

const logger = Logger.createContextLogger("SpeechBubble");

interface SpeechBubbleProps extends SpeechBubbleConfig {
    onFinished?: (success: boolean) => void;
}

export interface SpeechBubbleHandle {
    close: () => void;
    cleanup: () => void;
}

const DEFAULT_CONFIG = {
    backgroundColor: Color3.fromRGB(255, 255, 255),
    textColor: Color3.fromRGB(0, 0, 0),
    typingSpeed: 0.03,
    baseDisplayTime: 1.5,
    extraTimePerChar: 0.08,
};

// Helper for animation state tracking
interface FrameSizeState {
    wasAppearing: boolean;
    wasDisappearing: boolean;
}

// The main speech bubble component
function SpeechBubbleComponent(props: SpeechBubbleProps, ref: React.Ref<SpeechBubbleHandle>) {
    // Merge default config with props
    const config = {
        ...DEFAULT_CONFIG,
        ...props,
    };

    // State
    const [state, setState] = useState<SpeechBubbleState>(SpeechBubbleState.INITIALIZING);
    const [text, setText] = useState("");
    const [portraitImage, setPortraitImage] = useState("");
    const [hasFinished, setHasFinished] = useState(false);

    // Refs
    const containerRef = useRef<Part | undefined>(undefined);
    const portraitMapRef = useRef<Map<string, string> | undefined>(undefined);
    const connectionsRef = useRef<(() => void)[]>([]);
    const frameSizeStateRef = useRef<FrameSizeState>({
        wasAppearing: false,
        wasDisappearing: false
    });

    // Initialize portrait map
    useEffect(() => {
        if (config.portrait) {
            initializePortraitMap();
        }

        return () => {
            cleanup();
        };
    }, []);

    // Handle state changes
    useEffect(() => {
        if (state === SpeechBubbleState.APPEARING) {
            frameSizeStateRef.current.wasAppearing = true;
        } else if (state === SpeechBubbleState.TYPING) {
            startTyping();
        } else if (state === SpeechBubbleState.DISPLAYING) {
            scheduleDisappearance();
        } else if (state === SpeechBubbleState.DISAPPEARING) {
            frameSizeStateRef.current.wasDisappearing = true;
        } else if (state === SpeechBubbleState.DESTROYED) {
            cleanup();
        }
    }, [state]);

    // Initialize portrait map
    const initializePortraitMap = () => {
        if (!config.portrait) return;

        portraitMapRef.current = new Map<string, string>();
        const entityPortraitFolder = portraitsFolder.FindFirstChild(config.portrait) as Folder;
        if (!entityPortraitFolder) {
            logger.error(`Portrait folder not found for ${config.portrait}`);
            return;
        }

        const portraitImages = entityPortraitFolder.GetChildren().filter(child => child.IsA("Decal"));
        for (const image of portraitImages) {
            const imageName = image.Name;
            const imageId = image.Texture;
            portraitMapRef.current.set(imageName, imageId);
        }

        // Set initial portrait
        const neutralPortraitID = portraitMapRef.current.get('neutral');
        if (neutralPortraitID) {
            setPortraitImage(neutralPortraitID);
        }
    };

    // Start typewriter effect
    const startTyping = () => {
        const characters = config.message.split("");
        let currentText = "";
        let i = 0;

        const typeChar = () => {
            if (i < characters.size()) {
                currentText += characters[i];
                setText(currentText);
                i++;

                if (i % 5 === 0) {
                    togglePortraitSpeaking();
                }

                // Schedule next character
                const connection = task.delay(config.typingSpeed, typeChar);
                connectionsRef.current.push(() => task.cancel(connection));
            } else {
                // All characters have been typed
                setState(SpeechBubbleState.DISPLAYING);
                if (portraitMapRef.current) {
                    const neutralPortrait = portraitMapRef.current.get('neutral');
                    if (neutralPortrait) {
                        setPortraitImage(neutralPortrait);
                    }
                }
            }
        };

        typeChar();
    };

    // Toggle portrait speaking/neutral
    const togglePortraitSpeaking = () => {
        if (!config.portrait || !portraitMapRef.current) return;

        const neutralPortraitID = portraitMapRef.current.get('neutral');
        const speakingPortraitID = portraitMapRef.current.get('neutral_a');

        if (!neutralPortraitID || !speakingPortraitID) {
            logger.error(`Portrait image not found for ${config.portrait}`);
            return;
        }

        setPortraitImage(current =>
            current === neutralPortraitID ? speakingPortraitID : neutralPortraitID
        );
    };

    // Schedule disappearance
    const scheduleDisappearance = () => {
        // Calculate display duration based on message length
        const displayDuration = config.baseDisplayTime +
            (config.message.size() * config.extraTimePerChar);

        const connection = task.delay(displayDuration, () => {
            if (!hasFinished) {
                setState(SpeechBubbleState.DISAPPEARING);
            }
        });

        connectionsRef.current.push(() => task.cancel(connection));
    };

    // Cleanup function
    const cleanup = () => {
        if (hasFinished) return;

        setHasFinished(true);

        // Clean up all connections
        connectionsRef.current.forEach(conn => conn());
        connectionsRef.current = [];

        // Clean up container
        if (containerRef.current && containerRef.current.Parent) {
            containerRef.current.Destroy();
        }

        // Notify parent component
        props.onFinished?.(true);
    };

    // Close the speech bubble early
    const close = () => {
        if (!hasFinished) {
            setState(SpeechBubbleState.DISAPPEARING);
        }
    };

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
        close,
        cleanup,
    }));

    // Create and manage container part
    useEffect(() => {
        // Create container part
        const container = new Instance("Part");
        container.Name = "SpeechBubbleContainer";
        container.Anchored = true;
        container.CanCollide = false;
        container.Size = new Vector3(4, 2, 0.1);
        container.Transparency = 1;

        // Position above the parent model's head
        const headOffset = new Vector3(0, 5, 0);
        container.Position = config.parent.Position.add(headOffset);
        container.Parent = Workspace;

        containerRef.current = container;

        // Monitor ancestry changes
        const ancestryChangedConnection = container.AncestryChanged.Connect(() => {
            if (!container.IsDescendantOf(game)) {
                cleanup();
                props.onFinished?.(false);
            }
        });

        connectionsRef.current.push(() => {
            ancestryChangedConnection.Disconnect();
        });

        // Monitor parent position
        const parentChangeConnection = RunService.RenderStepped.Connect(() => {
            // Update speech bubble position to match parent position if parent changes position
            if (config.parent && config.parent.Parent) {
                const headOffset = new Vector3(0, 5, 0);
                container.Position = config.parent.Position.add(headOffset);
            } else if (config.parent && !config.parent.Parent) {
                // Parent was removed, clean up the speech bubble
                cleanup();
                props.onFinished?.(false);
            }
        });

        connectionsRef.current.push(() => {
            parentChangeConnection.Disconnect();
        });

        // Start the speech bubble lifecycle
        setState(SpeechBubbleState.APPEARING);

        return () => {
            cleanup();
        };
    }, []);

    // Animation helpers
    const getFrameSize = () => {
        switch (state) {
            case SpeechBubbleState.INITIALIZING:
            case SpeechBubbleState.APPEARING:
                return new UDim2(0, 0, 0, 0); // Starting size
            case SpeechBubbleState.TYPING:
            case SpeechBubbleState.DISPLAYING:
                return new UDim2(1, 0, 1, 0); // Full size
            case SpeechBubbleState.DISAPPEARING:
            case SpeechBubbleState.DESTROYED:
                return new UDim2(0, 0, 0, 0); // Ending size
        }
    };

    const getFrameTransparency = () => {
        return state === SpeechBubbleState.DISAPPEARING ||
            state === SpeechBubbleState.DESTROYED ? 1 : 0.5;
    };

    // Handle size changes for animation state transitions
    const handleSizeChange = (rbx: Frame) => {
        const size = rbx.Size;

        // Detect when appearing animation finishes
        if (state === SpeechBubbleState.APPEARING &&
            frameSizeStateRef.current.wasAppearing &&
            size.X.Scale >= 0.99) {
            frameSizeStateRef.current.wasAppearing = false;
            setState(SpeechBubbleState.TYPING);
        }
        // Detect when disappearing animation finishes
        else if (state === SpeechBubbleState.DISAPPEARING &&
            frameSizeStateRef.current.wasDisappearing &&
            size.X.Scale <= 0.01) {
            frameSizeStateRef.current.wasDisappearing = false;
            setState(SpeechBubbleState.DESTROYED);
        }
    };

    // Return an empty frame if the container isn't ready yet
    // This ensures we always return a JSX element and never undefined
    if (!containerRef.current) {
        return <frame key="empty" Visible={false} />;
    }

    // Render component
    return (
        <billboardgui
            key="SpeechBubbleGUI"
            Adornee={containerRef.current}
            Size={new UDim2(0, 400, 0, 100)}
            StudsOffset={new Vector3(0, 0, 0)}
            AlwaysOnTop={true}
        >
            <frame
                key="BubbleFrame"
                Size={getFrameSize()}
                Position={new UDim2(0.5, 0, 0.5, 0)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                BackgroundColor3={config.backgroundColor}
                BackgroundTransparency={getFrameTransparency()}
                Change={{
                    Size: handleSizeChange
                }}
            >
                {config.portrait ? (
                    <imagelabel
                        key="Portrait"
                        Size={new UDim2(0.3, 0, 1, 0)}
                        Position={new UDim2(0, 0, 0, 0)}
                        BackgroundTransparency={1}
                        Image={portraitImage}
                        ScaleType={Enum.ScaleType.Crop}
                    />
                ) : undefined}

                <textlabel
                    key="SpeechText"
                    Size={new UDim2(0.9, 0, 0.8, 0)}
                    Position={new UDim2(
                        config.portrait ? 0.3 : 0.05, 0,
                        0.45, 0
                    )}
                    AnchorPoint={new Vector2(0, 0.5)}
                    BackgroundTransparency={1}
                    TextColor3={config.textColor}
                    TextSize={18}
                    Font={Enum.Font.GothamMedium}
                    TextWrapped={true}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    TextYAlignment={Enum.TextYAlignment.Center}
                    Text={text}
                />

                <imagelabel
                    key="Pointer"
                    BackgroundTransparency={1}
                    Size={new UDim2(0.2, 0, 0.2, 0)}
                    Position={new UDim2(0.5, 0, 1, 0)}
                    AnchorPoint={new Vector2(0.5, 0)}
                    Image="rbxassetid://172525946"
                    ImageColor3={config.backgroundColor}
                />

                <uicorner
                    key="Corner"
                    CornerRadius={new UDim(0.05, 0)}
                />

                <uistroke
                    key="Stroke"
                    Color={new Color3(0.16, 0.16, 0.16)}
                    Thickness={2}
                />
            </frame>
        </billboardgui>
    );
}

// Create the forwardRef version of the component
const SpeechBubble = React.forwardRef(SpeechBubbleComponent);

// Helper function to create a speech bubble
function createSpeechBubble(
    config: SpeechBubbleConfig
): {
    finished: Promise<boolean>;
    component: JSX.Element;
    close: () => void;
    cleanup: () => void;
} {
    let resolveFn: (value: boolean) => void = () => { throw "resolveFn not set"; };
    const finishedPromise = new Promise<boolean>((resolve) => {
        resolveFn = resolve;
    });

    const bubbleRef = React.createRef<SpeechBubbleHandle>();

    const handleFinished = (success: boolean) => {
        resolveFn(success);
    };

    const component = (
        <SpeechBubble
            {...config}
            ref={bubbleRef}
            onFinished={handleFinished}
        />
    );

    return {
        finished: finishedPromise,
        component,
        close: () => bubbleRef.current?.close(),
        cleanup: () => bubbleRef.current?.cleanup(),
    };
}

// Create a simple container to host a speech bubble directly in the workspace
function createSpeechBubbleInstance(
    config: SpeechBubbleConfig
): {
    finished: Promise<boolean>;
    close: () => void;
    cleanup: () => void;
} {
    const container = new Instance("Part");
    container.Name = "SpeechBubbleHost";
    container.Anchored = true;
    container.CanCollide = false;
    container.Transparency = 1;
    container.Size = new Vector3(0, 0, 0);
    container.Parent = Workspace;

    // Create a React root
    const root = ReactRoblox.createRoot(container);

    // Create the bubble
    const { component, finished, close, cleanup } = createSpeechBubble(config);

    // Render the bubble
    root.render(component);

    // Return a combined API
    return {
        finished,
        close,
        cleanup: () => {
            cleanup();
            root.unmount();
            container.Destroy();
        }
    };
}

export {
    createSpeechBubble,
    createSpeechBubbleInstance, SpeechBubble as default
};
