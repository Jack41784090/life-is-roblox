import { EntityStats } from "../../../State/Entity/types";
import { Potency } from "./types";

export const potencyMap: Record<Potency, [keyof EntityStats, number][]> = {
    [Potency.Strike]: [
        ['str', 1]
    ],
    [Potency.Slash]: [
        ['str', 1]
    ],
    [Potency.Stab]: [
        ['str', 1]
    ],
    [Potency.TheWay]: [
        ['fai', 1.1]
    ],
    [Potency.Light]: [
        ['fai', .4],
        ['wil', .6],
    ],
    [Potency.Dark]: [
        ['cha', .25],
        ['wil', .75],
    ],
    [Potency.Arcane]: [
        ['int', .85],
        ['wil', .15],
    ],
    [Potency.Elemental]: [
        ['int', .65],
        ['spr', .35],
    ],
    [Potency.Occult]: [
        ['wil', .1],
        ['spr', .4],
        ['cha', .5],
    ],
    [Potency.Spiritual]: [
        ['spr', .9],
        ['wil', .1],
    ],
}