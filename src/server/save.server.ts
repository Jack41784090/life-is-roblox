
// saveAbility(
//     {
//         name: "Firebolt",
//         description: "A puny bolt of fire",
//         acc: 100,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Elemental, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Fire, 1]
//         ]),
//     },
//     {
//         name: "Ice Shard",
//         description: "A shard of ice",
//         acc: 100,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Elemental, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Frost, 0.5],
//             [DamageType.Blunt, .25],
//             [DamageType.Pierce, .25]
//         ]),
//     },
//     {
//         name: "Rock Sling",
//         description: "A rock slung with force",
//         acc: 100,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Elemental, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Blunt, 1]
//         ]),
//     },
//     {
//         name: "Arcane Arrow",
//         description: "An arrow of pure magic",
//         acc: 105,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Arcane, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Arcane, .5],
//             [DamageType.Pierce, .5]
//         ]),
//     },
//     {
//         name: "Bolt of Radiance",
//         description: "A bolt of radiant light",
//         acc: 110,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Light, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Electric, .8],
//             [DamageType.Spiritual, .2]
//         ]),
//     },
//     {
//         name: "Shadowbolt",
//         description: "A bolt of shadowy darkness",
//         acc: 95,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Dark, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Necrotic, 1.05]
//         ]),
//     },
//     {
//         name: "Psychic Lash",
//         description: "A lash of psychic energy",
//         acc: 120,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Occult, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Psychic, .5]
//         ]),
//     },
//     {
//         name: "Spirit Jolt",
//         description: "A jolt of spiritual energy",
//         acc: 100,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.Spiritual, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Arcane, .5],
//             [DamageType.Spiritual, .5]
//         ]),
//     },
//     {
//         name: "Theurgic Symbol",
//         description: "A symbol of theurgic power",
//         acc: 100,
//         cost: { pos: 10, mana: 10 },
//         potencies: new Map([
//             [Potency.TheWay, 1]
//         ]),
//         damageType: new Map([
//             [DamageType.Divine, .5]
//         ]),
//     }
// )

import { Players } from "@rbxts/services";
import { Database } from "shared/datastore";
import remotes from "shared/remote";
import { getDatastore } from "shared/utils";

remotes.requestData.connect((player: Player, datastoreName, key) => {
    const datastore = getDatastore(datastoreName);
    const [success, data] = pcall(() => datastore.GetAsync(key));
    if (success) return data;
    else {
        warn(data);
        return undefined;
    }
})

Players.PlayerAdded.Connect(p => {
    const db = Database.Get()
    // db.setPlayerData(`${p.UserId}`, {
    //     money: 100,
    // })

    // db.loadPlayerData(p).then(() => {
    //     const playerData = db.getPlayerData(`${p.UserId}`);
    //     print(playerData?.money)
    // })
})


// const scene = {
//     name: "Test Scene",
//     dialogues: [
//         {
//             speaker: "Adalbrecht",
//             text: "Hello, world!",
//             expression: DialogueExpression.Neutral,
//             effects: []
//         }
//     ]
// }
