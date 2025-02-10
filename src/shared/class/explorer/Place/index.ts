import { ReplicatedStorage, Workspace } from "@rbxts/services";
import { PlaceName } from "shared/const";
import { PlaceConfig } from "shared/types/explorer-types";
import NPC from "../NPC";
import { NPCConfig } from "../NPC/types";

export default class Place {
    private location: string;
    private model: Model;
    private NPCCs: NPCConfig[];
    private NPCs: NPC[] = [];
    private destroyed = false;

    public static GetPlace(placeName: PlaceName) {
        return new Place({
            locationName: placeName,
            NPCs: [
                {
                    id: 'entity_adalbrecht',
                    // id: 'R15',
                    displayName: 'NPC 1',
                    spawnLocation: new Vector3(0, 0, 0),
                },
                // {
                //     // id: 'entity_adalbrecht',
                //     id: 'R15',
                //     displayName: 'NPC 2',
                //     spawnLocation: new Vector3(0, 0, 0),
                // },
            ],
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

    public destroy() {
        if (this.destroyed) return
        this.destroyed = true

        this.NPCs.forEach(npc => npc.destroy())
        this.model.Destroy()
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
}