import Logger from "shared/utils/Logger";

export const logger = Logger.createContextLogger("SpeechBubble");

export const BUBBLESIZEPROPORTION = UDim2.fromScale(0.35, 0.25);

export const SPEECH_BUBBLE_DEFAULT_CONFIG = {
    backgroundColor: Color3.fromRGB(255, 255, 255),
    textColor: Color3.fromRGB(0, 0, 0),
    typingSpeed: 0.03,
    baseDisplayTime: 1.5,
    extraTimePerChar: 0.08,
};