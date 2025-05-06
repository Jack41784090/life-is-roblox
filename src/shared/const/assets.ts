import { ReplicatedStorage } from "@rbxts/services";

export const HEXAGON = ReplicatedStorage.WaitForChild("PerfectHex") as UnionOperation;

// Folders
export const uiFolder = ReplicatedStorage.WaitForChild("UI") as Folder;
export const modelFolder = ReplicatedStorage.WaitForChild("Models") as Folder;
export const NPCFolder = modelFolder.WaitForChild("NPCs") as Folder;
export const locationFolder = ReplicatedStorage.WaitForChild("Locations") as Folder;
export const indoorsFolder = locationFolder.WaitForChild("Indoors") as Folder;
export const scenesFolder = ReplicatedStorage.WaitForChild("Scenes") as Folder;
export const portraitsFolder = ReplicatedStorage.WaitForChild("Portraits") as Folder;
