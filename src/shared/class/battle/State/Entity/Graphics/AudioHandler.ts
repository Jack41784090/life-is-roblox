import { ReplicatedStorage } from "@rbxts/services";
import { EntityStatus } from "shared/class/battle/types";
import EntityGraphics from ".";

export default class AudioHandler {
    private idleSelectAudio: Sound[] = [];

    constructor(private entity: EntityGraphics, id: string) {
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder | undefined;
        const thisEntityAudio = audioFolder?.FindFirstChild(id) as Folder | undefined;
        this.idleSelectAudio = thisEntityAudio?.GetChildren().filter((audio) => audio.Name === "idle") as Sound[];
    }

    playIdleAudio() {
        if (this.idleSelectAudio.size() === 0) return;
        const index = math.random(0, this.idleSelectAudio.size() - 1);
        this.idleSelectAudio[index].Play();
    }

    play(entityStatus: EntityStatus) {
        if (entityStatus === EntityStatus.Idle) {
            this.playIdleAudio();
        }
    }
}