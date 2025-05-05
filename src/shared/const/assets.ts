import { ReplicatedStorage } from "@rbxts/services";
import { EntityStance } from "shared/class/battle/State/Entity/types";
import { AbilityType, ActiveAbilityConfig, DamageType, Potency } from "shared/class/battle/Systems/CombatSystem/Ability/types";

export const HEXAGON = ReplicatedStorage.WaitForChild("PerfectHex") as UnionOperation;

// Folders
export const uiFolder = ReplicatedStorage.WaitForChild("UI") as Folder;
export const modelFolder = ReplicatedStorage.WaitForChild("Models") as Folder;
export const NPCFolder = modelFolder.WaitForChild("NPCs") as Folder;
export const locationFolder = ReplicatedStorage.WaitForChild("Locations") as Folder;
export const indoorsFolder = locationFolder.WaitForChild("Indoors") as Folder;
export const scenesFolder = ReplicatedStorage.WaitForChild("Scenes") as Folder;
export const portraitsFolder = ReplicatedStorage.WaitForChild("Portraits") as Folder;

export const UNIVERSAL_PHYS = new Map<string, ActiveAbilityConfig>([
    ['High Slash', {
        type: AbilityType.Active,
        icon: 'rbxassetid://115770864932653',
        animation: 'swing',
        name: 'Slash',
        description: 'slashing',
        direction: EntityStance.High,
        dices: [1, 1, 1, 1],
        potencies: new Map<Potency, number>([
            [Potency.Slash, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Cut, 1]
        ]),
        cost: {
            pos: 10,
            mana: 0,
        },
        range: new NumberRange(1, 1),
    }]
])