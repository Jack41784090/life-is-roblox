import { Atom, atom } from "@rbxts/charm";
import { useMotion } from "@rbxts/pretty-react-hooks";
import React, { useEffect, useRef, useState } from "@rbxts/react";
import { useAtom } from "@rbxts/react-charm";
import { RunService, Workspace } from "@rbxts/services";
import GuiMothership from "gui_sharedfirst/new_components/main";
import { GuiTag } from "shared/const";
import { portraitsFolder } from "shared/const/assets";
import { springs } from "shared/utils";
import { BUBBLESIZEPROPORTION, logger, SPEECH_BUBBLE_DEFAULT_CONFIG } from "./const";
import { SpeechBubbleConfig, SpeechBubbleData, SpeechBubbleHandle, SpeechBubbleProps, SpeechBubbleState } from "./types";

const SpeechBubble = React.forwardRef((props: SpeechBubbleProps, ref: React.Ref<SpeechBubbleHandle>) => {
    const config = {
        ...SPEECH_BUBBLE_DEFAULT_CONFIG,
        ...props,
    };

    // State
    const [state, setState] = useState<SpeechBubbleState>(SpeechBubbleState.INITIALIZING);
    const [text, setText] = useState("");
    const [portraitImage, setPortraitImage] = useState("");
    const [hasFinished, setHasFinished] = useState(false);
    const [position, setPosition] = useState<UDim2>(new UDim2(0.5, 0, 0.5, 0));

    // Motion state for animations using useMotion
    const [frameSize, frameSizeMotion] = useMotion(new UDim2(0, 0, 0, 0));
    const [frameTransparency, frameTransparencyMotion] = useMotion(1); // Start fully transparent
    const [textTransparency, textTransparencyMotion] = useMotion(1); // For text fade in/out

    // Refs
    const frameRef = useRef<Frame | undefined>(undefined);
    const portraitMapRef = useRef<Map<string, string> | undefined>(undefined);
    const connectionsRef = useRef<(() => void)[]>([]);

    // Handle state changes
    useEffect(() => {
        switch (state) {
            case SpeechBubbleState.APPEARING:
                // Animate bubble appearance with spring physics
                frameSizeMotion.spring(BUBBLESIZEPROPORTION, springs.bubbly);
                frameTransparencyMotion.spring(0.5, springs.bubbly);

                const textAnimTimeout = task.delay(0.3, () => {
                    textTransparencyMotion.spring(0, springs.bubbly);
                });

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

    // Calculate position based on parent's position relative to camera
    let lastPosition = new Vector2();
    const updatePosition = () => {
        const camera = Workspace.CurrentCamera;
        if (!camera || !config.parent || !config.parent.Parent) return;

        // Get character's position with a small vertical offset
        const characterPosition = config.parent.Position.add(new Vector3(0, 3, 0));

        // Convert world position to viewport position
        const result = camera.WorldToViewportPoint(characterPosition);
        const viewportPosition = result[0] as Vector3;
        const isVisible = result[1] as boolean;

        const screenX = viewportPosition.X;
        const screenY = viewportPosition.Y;

        const viewportSize = camera.ViewportSize;
        const SCREEN_PADDING = 0;
        const BUBBLE_WIDTH = viewportSize.X * (BUBBLESIZEPROPORTION.Width.Scale);
        const BUBBLE_HEIGHT = viewportSize.Y * (BUBBLESIZEPROPORTION.Height.Scale);

        // Calculate ideal bubble position (above character)
        const intendedX = screenX - (BUBBLE_WIDTH / 2);
        const intendedY = screenY - BUBBLE_HEIGHT;
        const shouldLog = intendedX !== lastPosition.X || intendedY !== lastPosition.Y;

        // Helper function to format numbers to 1 decimal place (since toFixed isn't available)
        const format1Dec = (num: number) => math.floor(num * 10) / 10;
        const format2Dec = (num: number) => math.floor(num * 100) / 100;

        // Character is visible, check if the bubble would be out of bounds
        const isOutOfBounds = (
            intendedX < SCREEN_PADDING ||
            intendedX + BUBBLE_WIDTH > viewportSize.X - SCREEN_PADDING ||
            intendedY < SCREEN_PADDING ||
            intendedY + BUBBLE_HEIGHT > viewportSize.Y - SCREEN_PADDING
        );

        if (shouldLog) {
            let boundaryInfo = "";
            if (intendedX < SCREEN_PADDING) boundaryInfo += " LeftEdge";
            if (intendedX + BUBBLE_WIDTH > viewportSize.X - SCREEN_PADDING) boundaryInfo += " RightEdge";
            if (intendedY < SCREEN_PADDING) boundaryInfo += " TopEdge";
            if (intendedY + BUBBLE_HEIGHT > viewportSize.Y - SCREEN_PADDING) boundaryInfo += " BottomEdge";

            logger.debug(`[Bubble] Character screen=(${format1Dec(screenX)},${format1Dec(screenY)}), ideal=(${format1Dec(intendedX)},${format1Dec(intendedY)}), visibleOnScreen=${isVisible}, outOfBounds=${isOutOfBounds}${boundaryInfo}`);
        }

        if (!isVisible) {
            logger.debug(`[Bubble] Character not visible, using last position (${format1Dec(lastPosition.X)},${format1Dec(lastPosition.Y)})`);
            setPosition(UDim2.fromOffset(lastPosition.X, lastPosition.Y));
            return;
        }

        if (!isOutOfBounds) {
            lastPosition = new Vector2(intendedX, intendedY);
            setPosition(UDim2.fromOffset(intendedX, intendedY));
            if (shouldLog) {
                logger.debug(`[Bubble] Positioned at ideal location`);
            }
        } else {
            let adjustedX = intendedX;
            let adjustedY = intendedY;

            // Adjust X position if needed
            if (intendedX < SCREEN_PADDING) {
                adjustedX = SCREEN_PADDING;
            } else if (intendedX + BUBBLE_WIDTH > viewportSize.X - SCREEN_PADDING) {
                adjustedX = viewportSize.X - BUBBLE_WIDTH - SCREEN_PADDING;
            }

            if (intendedY < SCREEN_PADDING) {
                adjustedY = screenY;
            }
            else if (intendedY + BUBBLE_HEIGHT > viewportSize.Y - SCREEN_PADDING) {
                adjustedY = viewportSize.Y - BUBBLE_HEIGHT - SCREEN_PADDING;
            }

            // Use adjusted position
            lastPosition = new Vector2(adjustedX, adjustedY);
            setPosition(UDim2.fromOffset(adjustedX, adjustedY));

            if (shouldLog) {
                logger.debug(`[Bubble] Adjusted position: (${format1Dec(adjustedX)},${format1Dec(adjustedY)})`);
            }
        }
    };


    // Cleanup function
    const cleanup = () => {
        if (hasFinished) return;

        setHasFinished(true);

        // Clean up all connections
        connectionsRef.current.forEach(conn => conn());
        connectionsRef.current = [];

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

    // Setup rendering and initialize
    useEffect(() => {
        // Initialize portrait map if needed
        if (config.portrait) {
            initializePortraitMap();
        }

        // Create position update connection
        const positionUpdateConnection = RunService.RenderStepped.Connect(() => {
            updatePosition();
        });

        connectionsRef.current.push(() => {
            positionUpdateConnection.Disconnect();
        });

        // Start the speech bubble lifecycle
        setState(SpeechBubbleState.APPEARING);

        return () => {
            cleanup();
        };
    }, []);

    // Render component - now a frame within a ScreenGui instead of BillboardGui on a Part
    return (
        <frame
            key="BubbleFrame"
            ref={frameRef}
            Size={frameSize}
            Position={position}
            AnchorPoint={new Vector2(0, 0)}
            BackgroundColor3={config.backgroundColor}
            BackgroundTransparency={frameTransparency}
            SizeConstraint={Enum.SizeConstraint.RelativeXY}
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
    );
});

const SpeechBubbleContainer = React.forwardRef((props: { bubbles: Atom<SpeechBubbleData[]> }) => {
    const bubbles = useAtom(props.bubbles);

    return (
        <screengui
            key="SpeechBubbleScreenGui"
            IgnoreGuiInset={true}
            ResetOnSpawn={false}
            ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
        >
            {bubbles.map(bubble => bubble.component)}
        </screengui>
    );
});

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
