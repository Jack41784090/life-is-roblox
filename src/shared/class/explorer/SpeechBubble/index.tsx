import { Atom, atom } from "@rbxts/charm";
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useRef, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { RunService, Workspace } from "@rbxts/services";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { GuiTag } from "shared/const";
import { portraitsFolder } from "shared/const/assets";
import { springs } from "shared/utils";
import Logger from "shared/utils/Logger";
import { SpeechBubbleConfig, SpeechBubbleHandle, SpeechBubbleProps, SpeechBubbleState } from "./types";

const logger = Logger.createContextLogger("SpeechBubble");

const SPEECH_BUBBLE_DEFAULT_CONFIG = {
    backgroundColor: Color3.fromRGB(255, 255, 255),
    textColor: Color3.fromRGB(0, 0, 0),
    typingSpeed: 0.03,
    baseDisplayTime: 1.5,
    extraTimePerChar: 0.08,
};
function SpeechBubbleComponent(props: SpeechBubbleProps, ref: React.Ref<SpeechBubbleHandle>) {
    const config = {
        ...SPEECH_BUBBLE_DEFAULT_CONFIG,
        ...props,
    };

    // State
    const [state, setState] = useState<SpeechBubbleState>(SpeechBubbleState.INITIALIZING);
    const [text, setText] = useState("");
    const [portraitImage, setPortraitImage] = useState("");
    const [hasFinished, setHasFinished] = useState(false);

    // Motion state for animations using useMotion
    const [frameSize, frameSizeMotion] = useMotion(new UDim2(0, 0, 0, 0));
    const [frameTransparency, frameTransparencyMotion] = useMotion(1); // Start fully transparent
    const [pointerTransparency, pointerTransparencyMotion] = useMotion(1); // For pointer animation
    const [textTransparency, textTransparencyMotion] = useMotion(1); // For text fade in/out

    // Refs
    const containerRef = useRef<Part | undefined>(undefined);
    const frameRef = useRef<Frame | undefined>(undefined);
    const portraitMapRef = useRef<Map<string, string> | undefined>(undefined);
    const connectionsRef = useRef<(() => void)[]>([]);

    // Handle state changes
    useEffect(() => {
        switch (state) {
            case SpeechBubbleState.APPEARING:
                // Animate bubble appearance with spring physics
                frameSizeMotion.spring(new UDim2(1, 0, 1, 0), springs.bubbly);
                frameTransparencyMotion.spring(0.5, springs.bubbly);

                // Animate pointer and text with delayed triggers
                const pointerAnimTimeout = task.delay(0.15, () => {
                    pointerTransparencyMotion.spring(0.5, springs.bubbly);
                });

                const textAnimTimeout = task.delay(0.3, () => {
                    textTransparencyMotion.spring(0, springs.bubbly);
                });

                connectionsRef.current.push(() => task.cancel(pointerAnimTimeout));
                connectionsRef.current.push(() => task.cancel(textAnimTimeout));

                // After animation completes, transition to typing state
                const appearTimeout = task.delay(0.4, () => {
                    setState(SpeechBubbleState.TYPING);
                });
                connectionsRef.current.push(() => task.cancel(appearTimeout));
                break;

            case SpeechBubbleState.TYPING:
                startTyping();
                break;

            case SpeechBubbleState.DISPLAYING:
                scheduleDisappearance();
                break;

            case SpeechBubbleState.DISAPPEARING:
                // Animate text to disappear first
                textTransparencyMotion.spring(1, springs.responsive);

                // Animate frame and pointer with sequential delays
                const frameAnimTimeout = task.delay(0.1, () => {
                    frameTransparencyMotion.spring(1, springs.responsive);
                    pointerTransparencyMotion.spring(1, springs.responsive);
                });

                const frameSizeAnimTimeout = task.delay(0.2, () => {
                    frameSizeMotion.spring(new UDim2(0, 0, 0, 0), springs.responsive);
                });

                connectionsRef.current.push(() => task.cancel(frameAnimTimeout));
                connectionsRef.current.push(() => task.cancel(frameSizeAnimTimeout));

                // After animation completes, transition to destroyed state
                const disappearTimeout = task.delay(0.6, () => {
                    setState(SpeechBubbleState.DESTROYED);
                });
                connectionsRef.current.push(() => task.cancel(disappearTimeout));
                break;

            case SpeechBubbleState.DESTROYED:
                cleanup();
                break;
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
        // Initialise portrait map
        if (config.portrait) {
            initializePortraitMap();
        }

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
                ref={frameRef}
                Size={frameSize}
                Position={new UDim2(0.5, 0, 0.5, 0)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                BackgroundColor3={config.backgroundColor}
                BackgroundTransparency={frameTransparency}
            >
                {config.portrait ? (
                    <imagelabel
                        key="Portrait"
                        Size={new UDim2(0.3, 0, 1, 0)}
                        Position={new UDim2(0, 0, 0, 0)}
                        BackgroundTransparency={1}
                        Image={portraitImage}
                        ImageTransparency={frameTransparency.map((t) => t * 0.5)}
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
                    TextTransparency={textTransparency}
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
                    ImageTransparency={pointerTransparency}
                />

                <uicorner
                    key="Corner"
                    CornerRadius={new UDim(0.05, 0)}
                />

                <uistroke
                    key="Stroke"
                    Color={new Color3(0.16, 0.16, 0.16)}
                    Thickness={2}
                    Transparency={frameTransparency}
                />
            </frame>
        </billboardgui>
    );
}
const SpeechBubble = React.forwardRef(SpeechBubbleComponent);
interface SpeechBubbleData {
    component: JSX.Element;
    id: string;
    ref: React.RefObject<SpeechBubbleHandle>;
}

function SpeechBubbleContainerComponent(props: { bubbles: Atom<SpeechBubbleData[]> }, ref: React.Ref<SpeechBubbleHandle>) {
    const bubbles = useAtom(props.bubbles);

    return (
        <>
            {bubbles.map(bubble => bubble.component)}
        </>
    );
}
const SpeechBubbleContainer = React.forwardRef(SpeechBubbleContainerComponent);


export default class SpeechBubbleController {
    private static instance: SpeechBubbleController;
    private bubblesAtom: Atom<SpeechBubbleData[]>;

    private constructor() {
        if (SpeechBubbleController.instance) {
            throw ("Error: Singleton class already instantiated.");
        }
        this.bubblesAtom = atom<SpeechBubbleData[]>([]);
        GuiMothership.Mount(GuiTag.SpeechBubblesContainer, <SpeechBubbleContainer bubbles={this.bubblesAtom} />);
    }

    public static NewBubble(config: SpeechBubbleConfig): {
        finished: Promise<boolean>;
        component: JSX.Element;
        close: () => void;
        cleanup: () => void;
    } {
        const instance = this.Get();
        let resolveFn: (value: boolean) => void = () => { throw "resolveFn not set"; };
        const finishedPromise = new Promise<boolean>((resolve) => {
            resolveFn = resolve;
        });

        const bubbleRef = React.createRef<SpeechBubbleHandle>();
        const bubbleId = `bubble-${tick()}-${math.random()}`;

        const handleFinished = (success: boolean) => {
            // Remove bubble from the atom when finished
            instance.bubblesAtom((bubbles) =>
                bubbles.filter(b => b.id !== bubbleId)
            );
            resolveFn(success);
        };

        const component = (
            <SpeechBubble
                key={bubbleId}
                {...config}
                ref={bubbleRef}
                onFinished={handleFinished}
            />
        );

        // Create the bubble data object
        const bubbleData: SpeechBubbleData = {
            component,
            id: bubbleId,
            ref: bubbleRef
        };

        // Add the bubble to our atom
        instance.bubblesAtom((currentBubbles) => [...currentBubbles, bubbleData]);

        const close = () => {
            bubbleRef.current?.close();
        };

        const cleanup = () => {
            // Remove from the atom and cleanup the component
            instance.bubblesAtom((bubbles) =>
                bubbles.filter(b => b.id !== bubbleId)
            );
            bubbleRef.current?.cleanup();
        };

        return {
            finished: finishedPromise,
            component,
            close,
            cleanup,
        };
    }

    public static Get() {
        if (this.instance) {
            return this.instance;
        }
        return (this.instance = new SpeechBubbleController());
    }
}
