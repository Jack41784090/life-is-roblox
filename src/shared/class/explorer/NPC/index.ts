import { RunService } from "@rbxts/services";
import C from "../C";
import Place from "../Place";
import { SpeechBubbleConfig } from "../SpeechBubble/types";
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
        this.speak("Hello!");

        RunService.RenderStepped.Connect(() => {
            this.followPlayerScript();
        })
    }

    protected followPlayerScript() {
        const playerPos = this.associatedPlace?.getExplorerPosition();
        if (!playerPos) return;

        const thisPos = this.model.PrimaryPart!.Position;
        const diff = playerPos.sub(thisPos);
        if (diff.Magnitude > 5) {
            // Check if we're already talking
            if (!this.speechBubble) {
                const speechOptions: Partial<SpeechBubbleConfig> = {
                    baseDisplayTime: 2,
                };

                this.speak("Where are you going?", speechOptions);
            }
            this.currentDestination = playerPos;
        }
    }
}
