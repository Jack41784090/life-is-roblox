import { Workspace } from "@rbxts/services";
import { PlaceName } from "shared/const";
import { locationFolder } from "shared/const/assets";
import { PlaceConfig } from "shared/types/explorer-types";
import { newTouched } from "shared/utils";
import NPC from "../NPC";
import { NPCConfig } from "../NPC/types";
import PC from "../PC";
import IndoorLocation from "./Indoors";
import { DEBUG_PORTALS, IndoorLocationName } from "./Indoors/types";

// Debug flag to control logging across all portal-related classes

export default class Place {
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

    public static GetPlace(placeName: PlaceName) {
        const spawnLocation = Workspace.WaitForChild("SpawnLocation") as SpawnLocation;
        return new Place({
            locationName: placeName,
            NPCs: [
                // {
                //     id: 'entity_adalbrecht',
                //     displayName: 'NPC 1',
                //     spawnLocation: spawnLocation.Position,
                // },
            ],
            model: locationFolder.WaitForChild(placeName) as Model,
        })
    }

    constructor(placeInit: PlaceConfig) {
        const { locationName, NPCs, model: template } = placeInit;
        this.location = locationName;
        this.NPCs = [];
        this.NPCCs = NPCs;
        this.model = template.Clone();
        this.model.Parent = Workspace;
        this.initiateInnerSpaceTouches()
    }

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
                    const connection = newTouched(part, (hit) => {
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
                    warn(`[Place] Entrance part does not have a string value`);
                }
            }
        });
    }

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

    // Helper method for debug logging
    private logDebug(message: string) {
        if (DEBUG_PORTALS) {
            print(`[Place][${this.location}] ${message}`);
        }
    }

    private teleportToIndoorLocation(locationName: IndoorLocationName, portalId: string) {
        if (!this.explorer) return;

        const indoorLocation = this.indoorLocations.get(locationName);
        if (!indoorLocation) {
            warn(`[Place][${this.location}] Indoor location ${locationName} not found`);
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

    public exitIndoorLocation(fromPortalId: string) {
        if (!this.explorer || !this.currentIndoorLocation) return;

        // Record that this portal was just used
        this.lastUsedPortal = fromPortalId;

        // Teleport back
        this.currentIndoorLocation.exit(this.explorer.getModel());
        this.logDebug(`Explorer exited indoor location`);
        this.currentIndoorLocation = undefined;
    }

    public resetPortalState() {
        this.portalCooldowns.forEach((_, key) => {
            this.portalCooldowns.set(key, 0);
        });
        this.lastUsedPortal = "";
        this.playersInPortalZones.forEach((_, key) => {
            this.playersInPortalZones.set(key, false);
        });
    }

    public destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.NPCs.forEach(npc => npc.destroy());
        this.indoorLocations.forEach(location => location.destroy());
        this.entranceConnections.forEach(connection => connection.Disconnect());
        this.entranceExitConnections.forEach(connection => connection.Disconnect());
        this.model.Destroy();
    }

    public spawnNPCs() {
        this.NPCCs.forEach(npcConfig => {
            try {
                const npc = new NPC(npcConfig, this)
                this.NPCs.push(npc)
            } catch (err) {
                warn(`Failed to spawn NPC ${npcConfig.id}: ${err}`)
            }
        })
    }

    public getModel() {
        return this.model;
    }

    public getLocationName(): string {
        return this.location;
    }

    public getExplorerPosition() {
        return this.explorer?.getModel().PrimaryPart?.Position;
    }

    public spawnExplorer(model: string) {
        const pc = new PC({
            id: model,
            displayName: model,
            spawnLocation: new Vector3(0, 0, 0),
        }, this);
        this.explorer = pc;

        return pc.getModel();
    }

    public getIndoorLocation(name: IndoorLocationName): IndoorLocation | undefined {
        return this.indoorLocations.get(name);
    }

    public getCurrentIndoorLocation(): IndoorLocation | undefined {
        return this.currentIndoorLocation;
    }
}