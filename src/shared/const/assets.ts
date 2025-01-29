import { ReplicatedStorage } from "@rbxts/services";
import { AbilityType, DamageType, iAbility, Potency } from "shared/class/battle/State/Ability/types";

export const HEXAGON = ReplicatedStorage.WaitForChild("PerfectHex") as UnionOperation;

// UI
const uiFolder = ReplicatedStorage.WaitForChild("UI") as Folder;
export const otherPlayersTurnGui = uiFolder.WaitForChild("OtherPlayersTurnGui") as ScreenGui;


export const UNIVERSAL_PHYS = new Map<string, iAbility>([
    ['Slash', {
        type: AbilityType.Active,
        icon: 'rbxassetid://115770864932653',
        animation: 'swing',
        name: 'Slash',
        description: 'slashing',
        acc: 100,
        potencies: new Map<Potency, number>([
            [Potency.Slash, 1]
        ]),
        damageType: new Map<DamageType, number>([
            [DamageType.Slash, 1]
        ]),
        cost: {
            pos: 10,
            mana: 0,
        },
        range: new NumberRange(1, 1),
    }]
])