import { getDummyStats } from "shared/utils";
import { SquadBattleInstance } from "squad-battle";

const sb = new SquadBattleInstance({
    squads: {
        'team1': [{
            entities: [
                {
                    playerID: 1,
                    stats: getDummyStats(),
                    team: 'team1',
                }
            ],
            name: "Squad1"
        }],
        'team2': [{
            entities: [
                {
                    playerID: 2,
                    stats: getDummyStats(),
                    team: 'team2'
                }
            ],

            name: "Squad2"
        }]
    }
})

sb.autoBattle();

