import { Workspace } from "@rbxts/services";
import { PlaceName } from "shared/const";
import { locationFolder } from "shared/const/assets";
import { PlaceConfig } from "shared/types/explorer-types";
import NPC from "../NPC";
import { NPCConfig } from "../NPC/types";
import PC from "../PC";

export default class Place {
    private location: string;
    private model: Model;
    private NPCCs: NPCConfig[];
    private NPCs: NPC[] = [];
    private destroyed = false;
    private explorer?: PC;

    public static GetPlace(placeName: PlaceName) {
        const spawnLocation = Workspace.WaitForChild("SpawnLocation") as SpawnLocation;
        return new Place({
            locationName: placeName,
            NPCs: [
                {
                    id: 'entity_adalbrecht',
                    // id: 'R15',
                    displayName: 'NPC 1',
                    spawnLocation: spawnLocation.Position,
                },
                // {
                //     // id: 'entity_adalbrecht',
                //     id: 'R15',
                //     displayName: 'NPC 2',
                //     spawnLocation: new Vector3(0, 0, 0),
                // },
            ],
            model: locationFolder.WaitForChild(placeName) as Model,
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

    public getExplorerPosition() {
        // print(`[Place] Getting explorer position`, this.explorer?.getModel().PrimaryPart?.Position);
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
}