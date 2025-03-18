import { Workspace } from "@rbxts/services";
import { PlaceName } from "shared/const";
import { locationFolder } from "shared/const/assets";
import { PlaceConfig } from "shared/types/explorer-types";
import NPC from "../NPC";
import { NPCConfig } from "../NPC/types";
import PC from "../PC";
import IndoorLocation from "./Indoors";
import { IndoorLocationName } from "./Indoors/types";

export default class Place {
    private location: string;
    private model: Model;
    private NPCCs: NPCConfig[];
    private NPCs: NPC[] = [];
    private destroyed = false;
    private explorer?: PC;
    private indoorLocations = new Map<IndoorLocationName, IndoorLocation>();
    private currentIndoorLocation?: IndoorLocation;
    private entranceEntryCount = new Map<string, number>();
    private lastUsedPortal = "";

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
        this.model.GetDescendants().forEach((desc) => {
            if (desc.IsA('Part') && desc.Name === 'Entrance') {
                const stringValue = desc.FindFirstChildOfClass('StringValue');
                if (stringValue) {
                    const locationName = stringValue.Value as IndoorLocationName;
                    print(`[Place] Found entrance string value: ${locationName}`);

                    const portalId = `outdoor_${locationName}`;
                    this.entranceEntryCount.set(portalId, 0);

                    const indoorLocation = new IndoorLocation({
                        locationName,
                        entranceLocation: desc.Position,
                        parentPlace: this,
                    });

                    this.indoorLocations.set(locationName, indoorLocation);

                    // Set up entrance teleport trigger
                    desc.Touched.Connect((hit) => {
                        if (this.explorer && hit.IsDescendantOf(this.explorer.getModel())) {
                            this.handlePortalEntry(portalId, locationName);
                        }
                    });
                }
                else {
                    warn(`[Place] Entrance part does not have a string value`);
                }
            }
        });
    }

    private handlePortalEntry(portalId: string, locationName: IndoorLocationName) {
        if (!this.explorer) return;

        // Increase entry count for this portal
        const entryCount = (this.entranceEntryCount.get(portalId) || 0) + 1;
        this.entranceEntryCount.set(portalId, entryCount);
        print(`[Place] Portal ${portalId} entry count: ${entryCount}`);

        // Only teleport on odd-numbered entries
        // Also don't teleport if this was the last portal used (prevents double triggers)
        if (entryCount % 2 === 1 && this.lastUsedPortal !== portalId) {
            this.teleportToIndoorLocation(locationName, portalId);
        }
    }

    private teleportToIndoorLocation(locationName: IndoorLocationName, portalId: string) {
        if (!this.explorer) return;

        const indoorLocation = this.indoorLocations.get(locationName);
        if (!indoorLocation) {
            warn(`[Place] Indoor location ${locationName} not found`);
            return;
        }

        const explorerPosition = this.getExplorerPosition();
        if (!explorerPosition) return;

        this.currentIndoorLocation = indoorLocation;

        // Record that this portal was just used
        this.lastUsedPortal = portalId;

        // Teleport the explorer
        indoorLocation.enter(this.explorer.getModel(), explorerPosition);
        print(`[Place] Teleported explorer to indoor location ${locationName}`);
    }

    public exitIndoorLocation(fromPortalId: string) {
        if (!this.explorer || !this.currentIndoorLocation) return;

        // Record that this portal was just used
        this.lastUsedPortal = fromPortalId;

        // Teleport back
        this.currentIndoorLocation.exit(this.explorer.getModel());
        print(`[Place] Explorer exited indoor location`);
        this.currentIndoorLocation = undefined;
    }

    public resetPortalState() {
        this.entranceEntryCount.forEach((_, key) => {
            this.entranceEntryCount.set(key, 0);
        });
        this.lastUsedPortal = "";
    }

    public destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.NPCs.forEach(npc => npc.destroy());
        this.indoorLocations.forEach(location => location.destroy());
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