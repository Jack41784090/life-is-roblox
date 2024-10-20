import { ReplicatedStorage } from "@rbxts/services";

export const HEXAGON = ReplicatedStorage.WaitForChild("PerfectHex") as UnionOperation;

// UI
const uiFolder = ReplicatedStorage.WaitForChild("UI") as Folder;
export const otherPlayersTurnGui = uiFolder.WaitForChild("OtherPlayersTurnGui") as ScreenGui;
