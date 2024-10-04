import DialogueBox from "shared/class/Dialogue";

export interface iScene {
    name: string;
    dialogues: iDialogue[];
    dialogueBox: DialogueBox;
}

export interface iDialogue {
    speaker: string;
    text: string;
    expression: DialogueExpression;
    effects: unknown[];
}

export enum DialogueExpression {
    Neutral,
    Happy,
    Sad,
    Angry,
    Shocked
}
