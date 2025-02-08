import DialogueBox from "shared/class/scene/Dialogue";

export interface iScene {
    name: string;
    dialogues: iDialogue[];
    dialogueBox: DialogueBox;
}

export type DialogueConfig = Partial<iDialogue> & Pick<iDialogue, 'text'>;

export interface iDialogue {
    text: string;
    speaker: string;
    expression: DialogueExpression;
    effects: unknown[];
    alignment: DialogueAlignment;
}

export enum DialogueExpression {
    Neutral,
    Happy,
    Sad,
    Angry,
    Shocked
}

export type SceneConfig = {
    name: string;
    hasCover?: boolean;
}

export type DialogueBoxConfig = {
    initialText: string;
    hasCover?: boolean;
}

export type DialogueAlignment = 'top' | 'center' | 'bottom';

