import DialogueBox from "./Dialogue";
import { DialogueConfig, DialogueExpression, iDialogue, iScene, SceneConfig } from "./types";

export default class Scene implements iScene {
    readonly name: string;
    hasCover: boolean = false;
    dialogueBox: DialogueBox;
    dialogues: iDialogue[] = [];
    playingDialogue: iDialogue | undefined;

    constructor(config: SceneConfig) {
        this.dialogueBox = new DialogueBox({
            initialText: '',
            hasCover: config.hasCover
        });
        this.dialogueBox.hide();
        this.name = config.name
        this.hasCover = config.hasCover ?? false;
    }

    public addDialogue(...dialogues: DialogueConfig[]) {
        for (const dialogue of dialogues) {
            this.dialogues.push({
                text: dialogue.text,
                speaker: dialogue.speaker ?? '',
                expression: dialogue.expression ?? DialogueExpression.Neutral,
                effects: dialogue.effects ?? [],
                alignment: dialogue.alignment ?? 'bottom'
            });
        }
    }

    public async playFromBeginning() {
        const dialogueBox = this.dialogueBox;
        dialogueBox.enable();
        for (const currentDialogue of this.dialogues) {
            this.playingDialogue = currentDialogue;
            const { alignment, text, speaker } = currentDialogue;
            dialogueBox.align(alignment)
            const p = await dialogueBox.speak(text, speaker);
            wait(1);
        }
    }
}
