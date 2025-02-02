import { EntityStats } from "../Entity/types";
import { AbilityPotency } from "./types";

export const potencyMap: Record<AbilityPotency, [keyof EntityStats, number][]> = {
    [AbilityPotency.Strike]: [
        ['str', 1]
    ],
    [AbilityPotency.Slash]: [
        ['str', 1]
    ],
    [AbilityPotency.Stab]: [
        ['str', 1]
    ],
    [AbilityPotency.TheWay]: [
        ['fai', 1.1]
    ],
    [AbilityPotency.Light]: [
        ['fai', .4],
        ['wil', .6],
    ],
    [AbilityPotency.Dark]: [
        ['cha', .25],
        ['wil', .75],
    ],
    [AbilityPotency.Arcane]: [
        ['int', .85],
        ['wil', .15],
    ],
    [AbilityPotency.Elemental]: [
        ['int', .65],
        ['spr', .35],
    ],
    [AbilityPotency.Occult]: [
        ['wil', .1],
        ['spr', .4],
        ['cha', .5],
    ],
    [AbilityPotency.Spiritual]: [
        ['spr', .9],
        ['wil', .1],
    ],
}