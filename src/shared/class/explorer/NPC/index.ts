import { Players, RunService } from "@rbxts/services";
import C from "../C";
import Place from "../Place";
import { NPCConfig } from "./types";

enum CState {
    IDLE = 'idle',
    DECELERATE = 'decelerate',
    ACCELERATE = 'accelerate',
    FULL_WALK = 'sprinting',

    TALKING = 'talking',
    START_WALK = "START_WALK",
}

export default class NPC extends C {
    constructor(config: NPCConfig, place: Place) {
        super(config, place);
        RunService.RenderStepped.Connect(() => {
            this.followPlayerScript();
        })
    }

    protected followPlayerScript() {
        const playerPos = Players.LocalPlayer.Character!.PrimaryPart!.Position;
        const thisPos = this.model.PrimaryPart!.Position;
        const diff = playerPos.sub(thisPos);
        if (diff.Magnitude > 5) {
            this.startMoving(diff.Unit);
        } else {
            this.stopMoving();
        }
    }
}
