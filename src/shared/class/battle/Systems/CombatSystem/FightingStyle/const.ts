// import { EntityStance } from "shared/class/battle/State/Entity/types";
// import FightingStyle from ".";

// export const Default = () => new FightingStyle({
//     reactionAbilities: [{
//         animation: 'block',
//         name: 'Block',
//         description: 'Block incoming attacks',
//         icon: 'block',

//         direction: EntityStance.High,
//         chance: 100,
//         cost: {
//             pos: 10,
//             mana: 0,
//         },
//         successReaction: (aa, cr) => {
//             // print("aa", aa);
//             const us = aa.using;
//             const them = aa.target;
//             if (us === undefined || them === undefined) return {};
//             return {
//                 clashResult: {
//                     damage: 0,
//                 },
//                 using: {
//                     playerID: us.playerID,
//                     pos: us.pos - cr.damage,
//                 }
//             }
//         },
//         failureReaction: () => ({}),
//         getSuccessChance: () => 100,
//     }],
// })
