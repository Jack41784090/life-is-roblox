import { getDummyChangeableStats, getDummyStats } from "shared/utils";
import { SquadBattle } from "squad-battle";

const sb = new SquadBattle({
    squads: {
        'team1': [{
            entities: [
                {
                    playerID: 1,
                    stats: getDummyStats(),
                    changeableStats: getDummyChangeableStats(),
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
                    changeableStats: getDummyChangeableStats(),
                    team: 'team2'
                }
            ],

            name: "Squad2"
        }]
    }
})

sb.autoBattle();

