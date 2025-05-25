import { Workspace } from "@rbxts/services";
import { PlaceConfig } from "shared/class/explorer/types";
import { PlaceName } from "shared/const";
import { locationFolder } from "shared/const/assets";
import { createTouchDetector } from "shared/utils";
import Logger from "shared/utils/Logger";
import NPC from "../NPC";
import { NPCConfig } from "../NPC/types";
import PC from "../PC";
import IndoorLocation from "./Indoors";
import { DEBUG_PORTALS, IndoorLocationName } from "./Indoors/types";

/**
 * Place class handles management of game locations, including:
 * - Managing physical models in the workspace
 * - Handling transitions between outdoor and indoor locations
 * - Managing portal teleportation system
 * - Spawning and tracking NPCs within the place
 * - Managing the player (explorer) character
 */
export default class Place {
    protected logger = Logger.createContextLogger("Place");
    private location: string;
    private model: Model;
    private NPCCs: NPCConfig[];
    private NPCs: NPC[] = [];
    private destroyed = false;
    private explorer?: PC;
    private indoorLocations = new Map<IndoorLocationName, IndoorLocation>();
    private currentIndoorLocation?: IndoorLocation;
    private portalCooldowns = new Map<string, number>();
    private portalCooldownDuration = 1; // 1 second cooldown
    private lastUsedPortal = "";
    private entranceConnections = new Map<string, RBXScriptConnection>();
    private playersInPortalZones = new Map<string, boolean>();
    private entranceExitConnections = new Map<string, RBXScriptConnection>();

    //#region Initialization and Lifecycle

    /**
     * Creates a new Place instance for a given place name
     * @param placeName The name of the place to create
     * @returns A new Place instance
     */
    public static GetPlace(placeName: PlaceName) {
        const spawnLocation = Workspace.WaitForChild("SpawnLocation") as SpawnLocation;
        return new Place({
            locationName: placeName,
            NPCs: [
                {
                    id: 'entity_adalbrecht',
                    displayName: 'NPC 1',
                    spawnLocation: spawnLocation.Position,
                },
            ],
            model: locationFolder.WaitForChild(placeName) as Model,
        })
    }

    /**
     * Initializes a new Place instance
     * @param config Configuration data for the place
     */
    constructor(config: PlaceConfig) {
        const { locationName, NPCs, model: template } = config;
        this.location = locationName;
        this.NPCs = [];
        this.NPCCs = NPCs;
        this.model = template.Clone();
        this.model.Parent = Workspace;
        this.initiateInnerSpaceTouches()
    }

    /**
     * Cleans up all resources used by this Place
     * Destroys NPCs, indoor locations, and disconnects events
     */
    public destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.NPCs.forEach(npc => npc.destroy());
        this.indoorLocations.forEach(location => location.destroy());
        this.entranceConnections.forEach(connection => connection.Disconnect());
        this.entranceExitConnections.forEach(connection => connection.Disconnect());
        this.model.Destroy();
    }

    //#endregion

    //#region Portal Management

    /**
     * Sets up portal detection for all entrance parts in the model
     * Creates indoor locations and connects touch events
     */
    private initiateInnerSpaceTouches() {
        this.model.GetDescendants().forEach((part) => {
            if (part.IsA('Part') && part.Name === 'Entrance') {
                const stringValue = part.FindFirstChildOfClass('StringValue');
                if (stringValue) {
                    const locationName = stringValue.Value as IndoorLocationName;
                    this.logDebug(`Found entrance to ${locationName}`);

                    const portalId = `outdoor_${locationName}`;
                    this.portalCooldowns.set(portalId, 0);
                    this.playersInPortalZones.set(portalId, false);

                    const indoorLocation = new IndoorLocation({
                        locationName,
                        entranceLocation: part.Position,
                        parentPlace: this,
                    });

                    this.indoorLocations.set(locationName, indoorLocation);

                    // Set up entrance teleport trigger
                    const connection = createTouchDetector(part, (hit) => {
                        if (this.explorer && hit.IsDescendantOf(this.explorer.getModel())) {
                            // Only trigger if player is not already in portal zone
                            if (!this.playersInPortalZones.get(portalId)) {
                                this.playersInPortalZones.set(portalId, true);
                                this.handlePortalEntry(portalId, locationName);
                                this.setupPortalExitDetection(part, portalId);
                            }
                        }
                    })
                    this.entranceConnections.set(portalId, connection);
                }
                else {
                    this.logger.warn(`Entrance part does not have a string value`);
                }
            }
        });
    }

    /**
     * Sets up detection for when a player exits a portal zone
     * @param portalPart The physical part representing the portal
     * @param portalId Unique identifier for this portal
     */
    private setupPortalExitDetection(portalPart: BasePart, portalId: string) {
        // Clear any existing exit connection
        if (this.entranceExitConnections.has(portalId)) {
            this.entranceExitConnections.get(portalId)?.Disconnect();
        }

        // Create new exit detection
        const exitConnection = portalPart.TouchEnded.Connect((hit) => {
            if (!this.explorer) return;

            if (hit.IsDescendantOf(this.explorer.getModel())) {
                this.playersInPortalZones.set(portalId, false);
                this.logDebug(`Player exited portal zone ${portalId}`);

                // Reset portal cooldown once player has left the zone
                this.portalCooldowns.set(portalId, 0);
                if (this.lastUsedPortal === portalId) {
                    this.lastUsedPortal = "";
                }
            }
        });

        this.entranceExitConnections.set(portalId, exitConnection);
    }

    /**
     * Handles player entering a portal zone and initiates teleportation if conditions are met
     * @param portalId Unique identifier for the portal
     * @param locationName Name of the indoor location to teleport to
     */
    private handlePortalEntry(portalId: string, locationName: IndoorLocationName) {
        if (!this.explorer) return;

        // Check if portal is on cooldown or if it was the last used portal
        const now = tick();
        const lastUsedTime = this.portalCooldowns.get(portalId) || 0;

        if (now - lastUsedTime < this.portalCooldownDuration || this.lastUsedPortal === portalId) {
            this.logDebug(`Portal ${portalId} ignored - on cooldown or last used`);
            return;
        }

        // Set cooldown for this portal
        this.portalCooldowns.set(portalId, now);
        this.logDebug(`Portal ${portalId} activated`);

        // Teleport the player
        this.teleportToIndoorLocation(locationName, portalId);
    }

    /**
     * Resets all portal cooldowns and states
     * Useful when changing scenes or resetting the game state
     */
    public resetPortalState() {
        this.portalCooldowns.forEach((_, key) => {
            this.portalCooldowns.set(key, 0);
        });
        this.lastUsedPortal = "";
        this.playersInPortalZones.forEach((_, key) => {
            this.playersInPortalZones.set(key, false);
        });
    }

    //#endregion

    //#region Teleportation

    /**
     * Teleports the explorer to an indoor location
     * @param locationName Name of the indoor location to teleport to
     * @param portalId Portal identifier used for the teleportation
     */
    private teleportToIndoorLocation(locationName: IndoorLocationName, portalId: string) {
        if (!this.explorer) return;

        const indoorLocation = this.indoorLocations.get(locationName);
        if (!indoorLocation) {
            this.logger.warn(`[${this.location}] Indoor location ${locationName} not found`);
            return;
        }

        const explorerPosition = this.getExplorerPosition();
        if (!explorerPosition) return;

        this.currentIndoorLocation = indoorLocation;
        this.lastUsedPortal = portalId;

        // Teleport the explorer
        indoorLocation.enter(this.explorer.getModel(), explorerPosition);
        this.logDebug(`Teleported explorer to indoor location ${locationName}`);
    }

    /**
     * Teleports the explorer out of an indoor location
     * @param fromPortalId Portal identifier used for the exit teleportation
     */
    public exitIndoorLocation(fromPortalId: string) {
        if (!this.explorer || !this.currentIndoorLocation) return;

        // Record that this portal was just used
        this.lastUsedPortal = fromPortalId;

        // Teleport back
        this.currentIndoorLocation.exit(this.explorer.getModel());
        this.logDebug(`Explorer exited indoor location`);
        this.currentIndoorLocation = undefined;
    }

    //#endregion

    //#region NPC Management

    /**
     * Spawns all NPCs configured for this place
     */
    public spawnNPCs() {
        this.NPCCs.forEach(npcConfig => {
            try {
                const npc = new NPC(npcConfig, this)
                this.NPCs.push(npc)
            } catch (err) {
                this.logger.warn(`Failed to spawn NPC ${npcConfig.id}: ${err}`)
            }
        })
    }

    //#endregion

    //#region Explorer Management

    /**
     * Creates and spawns a player character (explorer) in this place
     * @param model Model identifier for the explorer
     * @returns The explorer's model
     */
    public spawnExplorer(model: string) {
        const pc = new PC({
            id: model,
            displayName: model,
            spawnLocation: new Vector3(0, 0, 0),
        }, this);
        this.explorer = pc;

        return pc.getModel();
    }

    /**
     * Gets the current position of the explorer
     * @returns The explorer's position or undefined if not available
     */
    public getExplorerPosition() {
        return this.explorer?.getModel().PrimaryPart?.Position;
    }

    //#endregion

    //#region Utility Methods

    /**
     * Logs debug messages, but only if portal debugging is enabled
     * @param message The message to log
     */
    private logDebug(message: string) {
        if (DEBUG_PORTALS) {
            // this.logger.debug(`[${this.location}] ${message}`);
        }
    }

    //#endregion

    //#region Getters

    /**
     * Gets the physical model representing this place
     */
    public getModel() {
        return this.model;
    }

    /**
     * Gets the name of this location
     */
    public getLocationName(): string {
        return this.location;
    }

    /**
     * Gets an indoor location by name
     * @param name Name of the indoor location to retrieve
     */
    public getIndoorLocation(name: IndoorLocationName): IndoorLocation | undefined {
        return this.indoorLocations.get(name);
    }

    /**
     * Gets the current indoor location the explorer is in, if any
     */
    public getCurrentIndoorLocation(): IndoorLocation | undefined {
        return this.currentIndoorLocation;
    }

    //#endregion
}