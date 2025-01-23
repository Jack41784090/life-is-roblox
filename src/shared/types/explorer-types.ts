
export type PlaceConfig = {
    locationName: string;
    NPCs: NPCConfig[];
    model: Model;
}

export type NPCConfig = {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
}
