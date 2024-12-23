import { ReplicatedStorage } from "@rbxts/services";
import { EntityStatus } from "shared/types/battle-types";
import EntityGraphics from ".";

export default class AudioHandler {
    private idleSelectAudio: Sound[] = [];

    constructor(private entity: EntityGraphics, id: string) {
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder;
        assert(audioFolder, "Audio folder not found");

        const thisEntityAudio = audioFolder.FindFirstChild(id) as Folder;
        assert(thisEntityAudio, `Audio for ${id} not found`);

        this.idleSelectAudio = thisEntityAudio.GetChildren().filter((audio) => audio.Name === "idle") as Sound[];
        assert(this.idleSelectAudio.size() > 0, "Idle select audio not found");
    }

    playIdleAudio() {
        assert(this.idleSelectAudio.size() > 0, "Idle select audio not found");
        const index = math.random(0, this.idleSelectAudio.size() - 1);
        this.idleSelectAudio[index].Play();
    }

    play(entityStatus: EntityStatus) {
        if (entityStatus === EntityStatus.Idle) {
            this.playIdleAudio();
        }
    }
}