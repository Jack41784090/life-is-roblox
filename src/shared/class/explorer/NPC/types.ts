export type NPCConfig = {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
    // npcwant: NPCWant;
    // npcbevr: NPCBehaviorProfile;
    // npcpers: NPCPersonality;
}

export type NPCNeedType = "Social" | "Food" | "Work" | "Leisure" | "Shopping" | "Home";

export type NPCNeed = {
    type: NPCNeedType;
    urgency: number; // 0-1 scale
    satisfactionDecay: number; // How quickly needs degrade
};

export type NPCWant = {
    needs: NPCNeed[];
};

export type NPCPersonality = {
    sociability: number; // 0-1 (shy to social)
    pace: number; // 0-1 (slow walker to fast walker)
    routineStrictness: number; // 0-1 (spontaneous to habitual)
};

export type NPCBehaviorProfile = {
    wants: NPCWant;
    personality: NPCPersonality;
    knownLocations: Map<string, CFrame>; // Key: "Market", "Tavern", "Park"
    dailySchedule: Map<number, string>; // Hour -> Activity
};
