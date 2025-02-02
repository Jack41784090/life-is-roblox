import { ReplicatedStorage } from "@rbxts/services";
import { AbilityDamageType, AbilityPotency, AbilityType, iActiveAbility } from "shared/class/battle/State/Ability/types";
import { EntityStance } from "shared/class/battle/State/Entity/types";

export const HEXAGON = ReplicatedStorage.WaitForChild("PerfectHex") as UnionOperation;

// UI
const uiFolder = ReplicatedStorage.WaitForChild("UI") as Folder;
export const otherPlayersTurnGui = uiFolder.WaitForChild("OtherPlayersTurnGui") as ScreenGui;


export const UNIVERSAL_PHYS = new Map<string, iActiveAbility>([
    ['High Slash', {
        type: AbilityType.Active,
        icon: 'rbxassetid://115770864932653',
        animation: 'swing',
        name: 'Slash',
        description: 'slashing',
        chance: 100,
        direction: EntityStance.High,
        potencies: new Map<AbilityPotency, number>([
            [AbilityPotency.Slash, 1]
        ]),
        damageType: new Map<AbilityDamageType, number>([
            [AbilityDamageType.Slash, 1]
        ]),
        cost: {
            pos: 10,
            mana: 0,
        },
        range: new NumberRange(1, 1),
    }]
])