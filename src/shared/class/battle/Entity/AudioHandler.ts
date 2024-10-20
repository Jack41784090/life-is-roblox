import { ReplicatedStorage } from "@rbxts/services";
import { EntityStatus } from "shared/types/battle-types";
import Entity from ".";

export default class AudioHandler {
    private idleSelectAudio: Sound[] = [];

    constructor(private entity: Entity) {
        this.initAudio();
    }

    initAudio() {
        // init audios
        const audioFolder = ReplicatedStorage.FindFirstChild("Audio") as Folder;
        const thisEntityAudio = audioFolder?.FindFirstChild(this.entity.stats.id) as Folder;
        if (!audioFolder) {
            warn("Audio folder not found");
            return;
        }
        if (!thisEntityAudio) {
            warn(`audio for ${this.entity.stats.id} not found`);
            return;
        }

        const allAudios = thisEntityAudio.GetChildren();
        this.idleSelectAudio = allAudios.filter((audio) => audio.Name === "idle") as Sound[];
        if (this.idleSelectAudio.size() === 0) {
            warn("Idle select audio not found");
        }
    }

    playIdleAudio() {
        // Logic to play idle audio
        if (!this.idleSelectAudio || this.idleSelectAudio?.size() === 0) {
            warn("Idle select audio not found");
            return;
        }
        const index = math.random(0, this.idleSelectAudio.size() - 1);
        this.idleSelectAudio[index].Play();
    }

    play(entityStatus: EntityStatus) {
        switch (entityStatus) {
            case EntityStatus.Idle:
                this.playIdleAudio();
                break;
        }
    }
}