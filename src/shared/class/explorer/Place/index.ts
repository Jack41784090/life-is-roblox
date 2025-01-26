import { ReplicatedStorage, Workspace } from "@rbxts/services";
import { PlaceName } from "shared/const";
import { NPCConfig, PlaceConfig } from "shared/types/explorer-types";
import NPC from "../NPC";

export default class Place {
    private location: string;
    private model: Model;
    private NPCCs: NPCConfig[];
    private NPCs: NPC[] = [];

    public static GetPlace(placeName: PlaceName) {
        return new Place({
            locationName: placeName,
            NPCs: [{
                id: 'R15',
                displayName: 'NPC 1',
                spawnLocation: new Vector3(0, 0, 0),
            }],
            model: ReplicatedStorage.WaitForChild(placeName) as Model,
        })
    }

    constructor(placeInit: PlaceConfig) {
        const { locationName, NPCs, model } = placeInit;
        this.location = locationName;
        this.NPCs = [];
        this.NPCCs = NPCs;

        const template = model;
        this.model = template.Clone();
        this.model.Parent = Workspace;
    }

    public spawnNPCs() {
        const NPCs = this.NPCs;
        for (const npcConfig of this.NPCCs) {
            const npc = new NPC(npcConfig, this);
            NPCs.push(npc);
        }
    }

    public getModel() {
        return this.model;
    }

    public getLocationName(): string {
        return this.location;
    }
}