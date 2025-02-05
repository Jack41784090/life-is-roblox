import { iDialogue, iScene } from "shared/types/scene-types";
import DialogueBox from "./Dialogue";

export default class Scene implements iScene {
    readonly name: string;
    dialogueBox: DialogueBox;
    dialogues: iDialogue[] = [];
    playingDialogue: iDialogue | undefined;

    constructor(_name: string) {
        this.dialogueBox = new DialogueBox('');
        this.dialogueBox.hide();
        this.name = _name;
    }

    addDialogue(..._dialogue: iDialogue[]) {
        for (const dialogue of _dialogue) {
            this.dialogues.push(dialogue);
        }
    }

    async playFromBeginning() {
        this.dialogueBox.enable();
        for (const currentDialogue of this.dialogues) {
            this.playingDialogue = currentDialogue;
            const p = await this.dialogueBox.speak(currentDialogue.text, currentDialogue.speaker);
            wait(1);
        }
    }
}
