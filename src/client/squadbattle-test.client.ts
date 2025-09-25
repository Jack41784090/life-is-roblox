import { getDummyStats } from "shared/utils";
import { SquadBattleInstance } from "squad-battle";
import { SquadBattleConfig, SquadConfig } from "squad-battle/type";

// const sb = new SquadBattleInstance({
//     squads: {
//         'team1': [{
//             entities: [
//                 {
//                     playerID: 1,
//                     stats: getDummyStats(),
//                     team: 'team1',
//                     name: 'A1'
//                 },
//                 {
//                     playerID: 3,
//                     stats: getDummyStats(),
//                     team: 'team1',
//                     name: 'A2'
//                 },
//                 {
//                     playerID: 5,
//                     stats: getDummyStats(),
//                     team: 'team1',
//                     name: 'A3'
//                 },
//                 {
//                     playerID: 7,
//                     stats: getDummyStats(),
//                     team: 'team1',
//                     name: 'A4'
//                 }
//             ],
//             name: "Squad1"
//         }],
//         'team2': [{
//             entities: [
//                 {
//                     playerID: 2,
//                     stats: getDummyStats(),
//                     team: 'team2'
//                 }
//             ],

//             name: "Squad2"
//         }]
//     }
// })

const team_count = 2;
const squad_count = 2
const squad_numbers = 5;
const config: SquadBattleConfig = {
    teams: {}
}

for (let tc = 0; tc < team_count; tc++) {
    config.teams[`team${tc + 1}`] = []
    const squads = config.teams[`team${tc + 1}`];
    for (let sc = 0; sc < squad_count; sc++) {
        const squad_config: SquadConfig = {
            name: `t${tc + 1}+squad${sc}`,
            entities: []
        };
        for (let sn = 0; sn < squad_numbers; sn++) {
            squad_config.entities.push({
                playerID: sn + math.random(),
                stats: getDummyStats(),
                team: `team${tc + 1}`,
                name: `tc${tc + 1}_${sc + 1}_${sn + 1}`
            })
        }

        squads.push(squad_config);
    }
}

const sb = new SquadBattleInstance(config);
sb.autoBattle();

