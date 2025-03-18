import { Workspace } from "@rbxts/services";
import { indoorsFolder } from "shared/const/assets";
import Place from "..";
import { IndoorLocationConfig } from "./types";

export default class IndoorLocation {
    private model: Model;
    private returnPoint?: Vector3;
    private destroyed = false;
    private parentPlace?: Place; // Reference to the parent Place instance
    private entranceEntryCount = 0;
    private portalId;

    constructor(config: IndoorLocationConfig) {
        const { locationName, parentPlace } = config;
        this.parentPlace = parentPlace;
        this.portalId = `indoor_${locationName}`;

        const locationModel = indoorsFolder.WaitForChild(locationName) as Model;
        assert(locationModel.IsA("Model"), (`[IndoorLocation] Could not find location model for ${locationName}`));
        this.model = locationModel.Clone();
        this.model.Parent = Workspace;
        this.model.MoveTo(config.entranceLocation.add(new Vector3(0, -180, 0)));
        this.setUpEntranceAsExitTrigger();
        print(`[IndoorLocation] Created location ${locationName}`);
    }

    private setUpEntranceAsExitTrigger() {
        const entrance = this.model.FindFirstChild('Entrance');
        if (entrance && entrance.IsA('Part')) {
            entrance.Touched.Connect((hit) => {
                // Check if the hit part belongs to a character
                const character = hit.Parent;
                const humanoid = character?.FindFirstChildOfClass('Humanoid');
                const isRootPart = character?.IsA('Model') && hit === character?.PrimaryPart;

                if (humanoid && this.parentPlace && this.returnPoint && isRootPart) {
                    // Increase entry count
                    this.entranceEntryCount++;
                    print(`[IndoorLocation] Entering location ${this.portalId} on entry ${this.entranceEntryCount}`);

                    // Only teleport on even-numbered entries for indoors (2nd, 4th etc.)
                    if (this.entranceEntryCount % 2 === 0) {
                        // Call exit function on parent Place
                        this.parentPlace.exitIndoorLocation(this.portalId);
                    }
                }
            });
        } else {
            warn("[IndoorLocation] No Entrance part found for exit trigger");
        }
    }

    public enter(entityModel: Model, returnPoint: Vector3) {
        // Store the return point and reset entry count
        this.returnPoint = returnPoint;
        this.entranceEntryCount = 0;

        // Find the indoor spawn point
        let spawnPoint = this.model.FindFirstChild("SpawnPoint");
        let targetPosition = new Vector3();

        if (!spawnPoint || !spawnPoint.IsA("BasePart")) {
            // If no SpawnPoint, use the entrance
            const entrance = this.model.FindFirstChild("Entrance");
            if (entrance && entrance.IsA("BasePart")) {
                targetPosition = entrance.Position;
            }
        } else {
            // Use the dedicated SpawnPoint
            targetPosition = spawnPoint.Position;
        }

        // Properly preserve the orientation using a different approach
        if (entityModel.PrimaryPart) {
            // Get the character's current look direction
            const currentCFrame = entityModel.PrimaryPart.CFrame;
            const lookVector = currentCFrame.LookVector;

            // Create a new CFrame that:
            // 1. Is positioned at the target location
            // 2. Faces in the same direction as the character was facing before
            const targetCFrame = CFrame.lookAt(
                targetPosition,                  // Target position 
                targetPosition.add(lookVector)   // Point to look at (position + direction)
            );

            // Teleport with preserved orientation
            entityModel.Parent = Workspace;
            entityModel.PivotTo(targetCFrame);
        } else {
            // Fallback if no PrimaryPart
            entityModel.Parent = Workspace;
            entityModel.PivotTo(new CFrame(targetPosition));
        }
    }

    public exit(entityModel: Model) {
        if (!this.returnPoint) return;

        // Reset entry count when exiting
        this.entranceEntryCount = 0;

        // Properly preserve orientation using the same approach
        if (entityModel.PrimaryPart) {
            // Get the character's current look direction
            const currentCFrame = entityModel.PrimaryPart.CFrame;
            const lookVector = currentCFrame.LookVector;

            // Create a new CFrame that maintains the character's look direction
            const targetCFrame = CFrame.lookAt(
                this.returnPoint,                    // Target position
                this.returnPoint.add(lookVector)     // Point to look at (position + direction)
            );

            // Teleport with preserved orientation
            entityModel.Parent = Workspace;
            entityModel.PivotTo(targetCFrame);
        } else {
            // Fallback if no PrimaryPart
            entityModel.Parent = Workspace;
            entityModel.PivotTo(new CFrame(this.returnPoint));
        }
    }

    public destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.model.Destroy();
    }

    public getModel(): Model {
        return this.model;
    }

    public resetPortalState() {
        this.entranceEntryCount = 0;
    }
}