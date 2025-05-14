
export interface SpeechBubbleConfig {
    /** The parent object to attach the speech bubble to */
    parent: BasePart;
    /** The text to display in the speech bubble */
    message: string;
    /** Optional background color of the bubble (defaults to white) */
    backgroundColor?: Color3;
    /** Optional text color (defaults to black) */
    textColor?: Color3;
    /** Optional typing speed in seconds per character (defaults to 0.03) */
    typingSpeed?: number;
    /** Optional base display duration in seconds (defaults to 1.5) */
    baseDisplayTime?: number;
    /** Optional extra time per character in seconds (defaults to 0.08) */
    extraTimePerChar?: number;
    portrait?: string;
}

export enum SpeechBubbleState {
    INITIALIZING = "initializing",
    APPEARING = "appearing",
    TYPING = "typing",
    DISPLAYING = "displaying",
    DISAPPEARING = "disappearing",
    DESTROYED = "destroyed"
}

export interface SpeechBubbleProps extends SpeechBubbleConfig {
    onFinished?: (success: boolean) => void;
}

export interface SpeechBubbleHandle {
    close: () => void;
    cleanup: () => void;
}
