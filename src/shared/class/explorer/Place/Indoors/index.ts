import { Workspace } from "@rbxts/services";
import { indoorsFolder } from "shared/const/assets";
import { createTouchDetector, visualizePosition } from "shared/utils";
import Logger from "shared/utils/Logger";
import Place from "..";
import { DEBUG_PORTALS, IndoorLocationConfig, IndoorLocationName } from "./types";

export default class IndoorLocation {
    private logger = Logger.createContextLogger("IndoorLocation");
    private model: Model;
    private locationName: IndoorLocationName;
    private returnPoint?: Vector3;
    private destroyed = false;
    private parentPlace?: Place;
    private portalId: string;
    private portalBoundboxConnection?: RBXScriptConnection;

    // Cooldown system (replacing entry count)
    private portalCooldowns = new Map<string, number>();
    private portalCooldownDuration = 1; // 1 second cooldown
    private lastUsedPortal = "";

    // Store portal-related positions
    private entrancePosition?: Vector3;
    private spawnPosition?: Vector3;
    private entranceSize?: Vector3;
    private entranceOrientation?: CFrame;

    // Store both entrance positions for relative positioning
    private outdoorEntrancePosition: Vector3;
    private indoorEntrancePosition?: Vector3;

    // Portal zone state tracking
    private playerInPortalZone = false;
    private exitPortalConnection?: RBXScriptConnection;

    // Floor height tracking
    private indoorFloorLevel?: number;
    private outdoorFloorLevel?: number;

    constructor(config: IndoorLocationConfig) {
        const { locationName, parentPlace } = config;
        this.locationName = locationName;
        this.parentPlace = parentPlace;
        this.portalId = `indoor_${locationName}`;

        const locationModel = indoorsFolder.WaitForChild(locationName) as Model;
        assert(locationModel.IsA("Model"), (`[IndoorLocation] Could not find location model for ${locationName}`));

        this.model = locationModel.Clone();
        this.model.Parent = Workspace;
        this.model.MoveTo(config.entranceLocation.add(new Vector3(0, -180, 0)));

        // Store the outdoor entrance position for reference
        this.entrancePosition = config.entranceLocation;
        this.outdoorEntrancePosition = config.entranceLocation;

        // Find and store important positions
        this.setupPortalPositions();

        this.setUpEntranceAsExitTrigger();
        this.logDebug(`Created location ${locationName}`);
    }

    private logDebug(message: string) {
        if (DEBUG_PORTALS) {
            // this.logger.debug(`[${this.locationName}] ${message}`);
        }
    }

    private handlePortalEntry(hit: BasePart) {
        if (!this.parentPlace || !this.returnPoint) return;

        // Get character model from hit
        const character = this.findCharacterFromHit(hit);
        if (!character) return;

        // Check if portal is on cooldown or was last used
        const now = tick();
        const lastUsedTime = this.portalCooldowns.get(this.portalId) || 0;

        if (now - lastUsedTime < this.portalCooldownDuration || this.lastUsedPortal === this.portalId) {
            this.logDebug(`Portal ignored - on cooldown or last used`);
            return;
        }

        // Set cooldown and exit the indoor location
        this.portalCooldowns.set(this.portalId, now);
        this.lastUsedPortal = this.portalId;
        this.logDebug(`Portal activated - exiting location`);

        // Call exit function on parent Place
        this.parentPlace.exitIndoorLocation(this.portalId);
    }

    /**
     * Helper method to find a character model from a hit part
     * More lenient than just checking for PrimaryPart
     */
    private findCharacterFromHit(hit: BasePart): Model | undefined {
        // Check if the hit part itself is from a character model
        const directParent = hit.Parent;
        if (directParent?.IsA("Model") && directParent.FindFirstChildOfClass("Humanoid")) {
            return directParent;
        }

        // Check if the hit is a descendant of a character
        let current: Instance | undefined = hit;
        while (current && current !== game) {
            if (current.IsA("Model") && current.FindFirstChildOfClass("Humanoid")) {
                return current;
            }
            current = current.Parent || undefined;
        }

        return undefined;
    }

    private setUpEntranceAsExitTrigger() {
        const entrance = this.model.FindFirstChild('Entrance');
        if (!entrance || (!entrance.IsA('Part') && !entrance.IsA('MeshPart'))) {
            this.logger.warn(`[${this.locationName}] No Entrance part found for exit trigger`);
            return;
        }

        const entrancePart = entrance as BasePart;

        // Handle entry to portal zone
        this.portalBoundboxConnection = createTouchDetector(entrancePart, (hit) => {
            if (this.playerInPortalZone) return;

            const character = this.findCharacterFromHit(hit);
            if (character) {
                this.playerInPortalZone = true;
                this.handlePortalEntry(hit);

                // Set up exit detection
                this.setupExitDetection(entrancePart, character);
            }
        });
    }

    private setupExitDetection(portal: BasePart, character: Model) {
        // Clear any existing connection
        if (this.exitPortalConnection) {
            this.exitPortalConnection.Disconnect();
            this.exitPortalConnection = undefined;
        }

        // Create a connection that checks when the character leaves the portal
        this.exitPortalConnection = portal.TouchEnded.Connect((hit) => {
            const partCharacter = this.findCharacterFromHit(hit);
            if (partCharacter === character) {
                this.playerInPortalZone = false;
                this.logDebug("Player exited portal zone");

                // Reset portal state after player has exited
                this.portalCooldowns.set(this.portalId, 0);
                if (this.lastUsedPortal === this.portalId) {
                    this.lastUsedPortal = "";
                }

                // Disconnect this event until needed again
                if (this.exitPortalConnection) {
                    this.exitPortalConnection.Disconnect();
                    this.exitPortalConnection = undefined;
                }
            }
        });
    }

    /**
     * Find and store the indoor spawn position and entrance info
     */
    private setupPortalPositions() {
        // Find the indoor entrance for reference
        const entrance = this.model.FindFirstChild('Entrance');
        if (!entrance || !entrance.IsA('BasePart')) {
            this.logDebug("No entrance part found, using model pivot");
            this.spawnPosition = this.model.GetPivot().Position;
            this.indoorEntrancePosition = this.model.GetPivot().Position;
            return;
        }

        // Store entrance properties for consistent teleportation
        const entrancePart = entrance as BasePart;
        this.entranceSize = entrancePart.Size;
        this.entranceOrientation = entrancePart.CFrame;

        // Store indoor entrance position
        this.indoorEntrancePosition = entrancePart.Position;

        // Store floor height information
        this.indoorFloorLevel = this.detectFloorLevel(entrancePart.Position, this.model);

        // Find dedicated spawn point if it exists
        const spawnPoint = this.model.FindFirstChild("SpawnPoint");
        if (spawnPoint?.IsA("BasePart")) {
            // Use the spawn point position
            this.spawnPosition = spawnPoint.Position;

            // Calculate offset between spawn and entrance for consistent positioning
            this.logDebug(`Using spawn point at ${this.spawnPosition}`);
        } else {
            // If no spawn point, use position slightly in front of entrance
            const entranceDir = entrancePart.CFrame.LookVector;
            this.spawnPosition = entrancePart.Position.add(entranceDir.mul(2));
            this.logDebug(`No spawn point, using position in front of entrance`);
        }
    }

    /**
     * Detect the floor level at a position by raycasting downward
     */
    private detectFloorLevel(position: Vector3, parent: Instance): number {
        // Try to raycast down to find the floor
        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = []; // Exclude nothing for now

        const rayStart = position.add(new Vector3(0, 3, 0)); // Start above position
        const rayEnd = position.add(new Vector3(0, -10, 0)); // Cast down 10 studs

        const result = Workspace.Raycast(rayStart, rayEnd.sub(rayStart), raycastParams);
        if (result && result.Position) {
            if (DEBUG_PORTALS) {
                visualizePosition(result.Position, Color3.fromRGB(0, 0, 255), 10);
                this.logDebug(`Detected floor at Y = ${result.Position.Y}`);
            }
            return result.Position.Y;
        }

        // If raycast fails, use the current Y position minus a small offset
        return position.Y - 3; // Assume floor is 3 studs below the reference point
    }

    /**
     * Teleports an entity to a target position while preserving its orientation
     */
    private teleportWithPreservedOrientation(entityModel: Model, targetPosition: Vector3): boolean {
        if (!entityModel) {
            this.logDebug("Cannot teleport null entity model");
            return false;
        }

        if (!entityModel.PrimaryPart) {
            this.logDebug("Entity model has no PrimaryPart, orientation will not be preserved");
            entityModel.Parent = Workspace;
            entityModel.PivotTo(new CFrame(targetPosition));
            return true;
        }

        // Get the character's current look direction
        const currentCFrame = entityModel.PrimaryPart.CFrame;
        const lookVector = currentCFrame.LookVector;

        // Create a new CFrame that preserves orientation
        const targetCFrame = CFrame.lookAt(
            targetPosition,
            targetPosition.add(lookVector)
        );

        visualizePosition(targetPosition, Color3.fromRGB(0, 255, 0));

        // Teleport with preserved orientation
        entityModel.Parent = Workspace;
        entityModel.PivotTo(targetCFrame);
        return true;
    }

    /**
     * Teleports an entity into this indoor location with relative positioning
     */
    public enter(entityModel: Model, returnPoint: Vector3) {
        this.returnPoint = returnPoint;
        this.lastUsedPortal = "";

        if (!this.indoorEntrancePosition) {
            this.logDebug("No indoor entrance position found");
            return;
        }

        // Store outdoor floor level for later use
        this.outdoorFloorLevel = this.detectFloorLevel(returnPoint, Workspace);

        // Calculate horizontal offset only (keep x and z, ignore y)
        const offsetFromOutdoorEntrance = new Vector3(
            returnPoint.X - this.outdoorEntrancePosition.X,
            0, // Ignore Y offset
            returnPoint.Z - this.outdoorEntrancePosition.Z
        );

        // Apply horizontal offset to indoor entrance
        let targetPosition = new Vector3(
            this.indoorEntrancePosition.X + offsetFromOutdoorEntrance.X,
            this.indoorEntrancePosition.Y, // Keep original Y temporarily
            this.indoorEntrancePosition.Z + offsetFromOutdoorEntrance.Z
        );

        // Apply floor height correction if we have floor information
        if (this.indoorFloorLevel !== undefined) {
            // Detect character height (assume humanoid root part is at feet + half height)
            const characterHeight = this.getCharacterHeight(entityModel);
            targetPosition = new Vector3(
                targetPosition.X,
                this.indoorFloorLevel + characterHeight,
                targetPosition.Z
            );
        }

        // Safety check to prevent invalid positions
        targetPosition = this.ensureSafePosition(targetPosition, this.model);

        if (DEBUG_PORTALS) {
            visualizePosition(this.outdoorEntrancePosition, Color3.fromRGB(255, 255, 0), 10);
            visualizePosition(returnPoint, Color3.fromRGB(0, 255, 255), 10);
            visualizePosition(this.indoorEntrancePosition, Color3.fromRGB(255, 0, 255), 10);
            visualizePosition(targetPosition, Color3.fromRGB(0, 255, 0), 10);
            this.logDebug(`Target position after safety checks: ${targetPosition}`);
        }

        this.teleportWithPreservedOrientation(entityModel, targetPosition);
        this.logDebug(`Entity entered from outdoor location using corrected positioning`);
    }

    /**
     * Teleports an entity out of this indoor location with relative positioning
     */
    public exit(entityModel: Model) {
        if (!this.returnPoint || !this.indoorEntrancePosition) {
            this.logDebug("Cannot exit: missing return point or indoor entrance position");
            return;
        }

        const currentPosition = entityModel.GetPivot().Position;
        this.lastUsedPortal = "";

        // Calculate horizontal offset only (keep x and z, ignore y)
        const offsetFromIndoorEntrance = new Vector3(
            currentPosition.X - this.indoorEntrancePosition.X,
            0, // Ignore Y offset
            currentPosition.Z - this.indoorEntrancePosition.Z
        );

        // Apply horizontal offset to outdoor entrance
        let targetPosition = new Vector3(
            this.outdoorEntrancePosition.X + offsetFromIndoorEntrance.X,
            this.outdoorEntrancePosition.Y, // Keep original Y temporarily
            this.outdoorEntrancePosition.Z + offsetFromIndoorEntrance.Z
        );

        // Apply floor height correction if we have floor information
        if (this.outdoorFloorLevel !== undefined) {
            // Detect character height (assume humanoid root part is at feet + half height)
            const characterHeight = this.getCharacterHeight(entityModel);
            targetPosition = new Vector3(
                targetPosition.X,
                this.outdoorFloorLevel + characterHeight,
                targetPosition.Z
            );
        }

        // Safety check to prevent invalid positions
        targetPosition = this.ensureSafePosition(targetPosition, Workspace);

        if (DEBUG_PORTALS) {
            visualizePosition(this.indoorEntrancePosition, Color3.fromRGB(255, 0, 255), 10);
            visualizePosition(currentPosition, Color3.fromRGB(0, 255, 255), 10);
            visualizePosition(this.outdoorEntrancePosition, Color3.fromRGB(255, 255, 0), 10);
            visualizePosition(targetPosition, Color3.fromRGB(255, 0, 0), 10);
            this.logDebug(`Target position after safety checks: ${targetPosition}`);
        }

        this.teleportWithPreservedOrientation(entityModel, targetPosition);
        this.logDebug(`Entity exited to outdoor location using corrected positioning`);
    }

    /**
     * Get approximate character height for floor positioning
     */
    private getCharacterHeight(model: Model): number {
        // Default to reasonable character height
        const DEFAULT_HEIGHT = 3;

        // Try to find humanoid root part or primary part
        const rootPart = model.PrimaryPart as BasePart ||
            model.PrimaryPart;

        if (rootPart) {
            return rootPart.Size.Y / 2;
        }

        return DEFAULT_HEIGHT;
    }

    /**
     * Ensures teleport position is valid and not inside geometry
     */
    private ensureSafePosition(position: Vector3, parent: Instance): Vector3 {
        // Check if position is inside any solid object
        const overlapParams = new OverlapParams();
        overlapParams.FilterType = Enum.RaycastFilterType.Include;
        overlapParams.FilterDescendantsInstances = [parent];

        const CHARACTER_SIZE = new Vector3(3, 6, 3);
        const parts = Workspace.GetPartBoundsInBox(
            new CFrame(position),
            CHARACTER_SIZE,
            overlapParams
        );

        // If position is clear, return it
        if (parts.size() === 0) {
            return position;
        }

        // Try to find a safe position nearby
        this.logDebug("Initial teleport position unsafe, finding alternative");

        // Raycast down from above to find a safe landing spot
        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [];

        const MAX_HEIGHT = 50;
        const rayStart = new Vector3(position.X, position.Y + MAX_HEIGHT, position.Z);
        const rayDirection = new Vector3(0, -MAX_HEIGHT * 2, 0);

        const result = Workspace.Raycast(rayStart, rayDirection, raycastParams);
        if (result && result.Position) {
            // Found a safe spot, adjust Y to be above the floor
            const characterHeight = 3;
            return new Vector3(
                position.X,
                result.Position.Y + characterHeight,
                position.Z
            );
        }

        // If we couldn't find a safe position, use the original return point
        this.logDebug("Could not find safe position, using fallback");
        if (this.returnPoint) {
            return this.returnPoint;
        }

        // Last resort: add height to original position
        return position.add(new Vector3(0, 5, 0));
    }

    public destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.portalBoundboxConnection?.Disconnect();
        this.exitPortalConnection?.Disconnect();
        this.model.Destroy();

        this.logDebug("Destroyed");
    }

    public getModel(): Model {
        return this.model;
    }

    public resetPortalState() {
        this.portalCooldowns.clear();
        this.lastUsedPortal = "";
    }
}