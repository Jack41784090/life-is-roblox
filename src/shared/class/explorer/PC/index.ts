import { RunService, UserInputService, Workspace } from "@rbxts/services";
import { getDirectionFromKeyCode } from "shared/utils";
import logger from "shared/utils/Logger";
import C from "../C";
import Place from "../Place";

export type PCConfig = {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
}

export default class PC extends C {
    private pcLogger = logger.createContextLogger("PlayerCharacter");

    constructor(config: PCConfig, place: Place) {
        super(config, place);

        RunService.RenderStepped.Connect(dt => {
            // this.pcLogger.debug(`State: ${this.state}`);
            this.keyInputTracker(dt);
        });
    }

    // Updated keyInputTracker to poll movement keys each frame
    private validMovementKeys = [
        Enum.KeyCode.W,
        Enum.KeyCode.A,
        Enum.KeyCode.S,
        Enum.KeyCode.D,
        Enum.KeyCode.Up,
        Enum.KeyCode.Left,
        Enum.KeyCode.Down,
        Enum.KeyCode.Right,
    ]
    protected keyInputTracker(dt: number) {
        let direction = new Vector3(0, 0, 0);
        for (const key of this.validMovementKeys) {
            // this.pcLogger.debug(`Checking key ${key}: ${UserInputService.IsKeyDown(key)}`);
            if (UserInputService.IsKeyDown(key) && Workspace.CurrentCamera) {
                this.hurrying = UserInputService.IsKeyDown(Enum.KeyCode.LeftShift);
                direction = direction.add(getDirectionFromKeyCode(key, Workspace.CurrentCamera));
            }
        }

        if (direction.Magnitude > 0) {
            // this.pcLogger.debug(`Moving in direction ${direction}`);
            this.startMoving(direction.Unit);
        } else {
            this.stopMoving();
        }
    }
}
