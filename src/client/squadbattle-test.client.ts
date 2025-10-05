import { getDummyStats } from "shared/utils";
import { SquadBattleInstance } from "squad-battle";
import { SquadBattle } from "squad-battle/Battle";
import { SquadBattleGraphics } from "squad-battle/Graphics";
import { EntityUpdate, SquadBattleConfig, SquadConfig, SquadEntityInSquadLocation } from "squad-battle/type";

function test_simpleautobattle() {
    const team_count = 2;
    const squad_count = 1
    const squad_numbers = 2;
    const config: SquadBattleConfig = {
        teams: {}
    }

    for (let tc = 0; tc < team_count; tc++) {
        const teamTag = `team${tc + 1}`;
        config.teams[teamTag] = []
        const squads = config.teams[teamTag];
        for (let sc = 0; sc < squad_count; sc++) {
            const squad_config: SquadConfig = {
                team: teamTag,
                name: `squad${tc + 1}-${string.char(65 + sc)}`,
                entities: []
            };
            for (let sn = 0; sn < squad_numbers; sn++) {
                squad_config.entities.push({
                    playerID: (tc + 1) * 100 + (sc) * 10 + sn + 1,
                    stats: getDummyStats(),
                    team: teamTag,
                    name: `tc${tc + 1}_${sc + 1}_${sn + 1}`,
                    logicType: 'Frontline'
                })
            }

            squads.push(squad_config);
        }
    }

    const sb = new SquadBattleInstance(config);
    sb.autoBattle(.5);
}

function test_fixedsequence() {
    const sb = new SquadBattle({
        teams: {
            'team1': [{
                entities: [{ playerID: 1, stats: getDummyStats(), team: 'team1', name: 'tc1_1_1', logicType: 'Frontline' }],
                name: 'squad1-A'
            }],
            'team2': [{
                entities: [{ playerID: 2, stats: getDummyStats(), team: 'team2', name: 'tc2_1_1', logicType: 'Frontline' }],
                name: 'squad2-A'
            }]
        }
    })
    const sbg = new SquadBattleGraphics(sb)

    const randomUpdates: EntityUpdate[] = [];
    for (let i = 0; i < 10; i++) {
        const u: EntityUpdate = math.random() < 0.5 ? {
            source: 1,
            affected: 2,
            change: {
                property: 'HP',
                from: sb.getEntityByID(2)!.get_changeableStat_num('HP'),
                to: sb.getEntityByID(2)!.get_changeableStat_num('HP') - 30,
            }
        } : {
            source: 2,
            affected: 2,
            change: {
                property: 'LOC',
                from: sb.getEntityByID(2)!.get_changeableStat_num('LOC'),
                to: math.max(1, math.min(3, sb.getEntityByID(2)!.get_changeableStat_num('LOC') + (math.random() < 0.5 ? 1 : -1))),
            }
        }
        randomUpdates.push(u)
    }
    sbg.render(randomUpdates)
}

function test_readjustweapon() {
    const sb = new SquadBattle({
        teams: {
            'team1': [{
                entities: [{
                    playerID: 1, stats: getDummyStats(), team: 'team1', name: 'tc1_1_1', logicType: 'Adjust_Weapon_Test',
                    startingLocation: SquadEntityInSquadLocation.front,
                    weapon: {
                        hitBonus: 0,
                        penetrationBonus: 0,
                        damageTranslation: {},
                        weaponRange: {
                            [SquadEntityInSquadLocation.front]: [SquadEntityInSquadLocation.front],
                            [SquadEntityInSquadLocation.middle]: [SquadEntityInSquadLocation.front, SquadEntityInSquadLocation.middle],
                            [SquadEntityInSquadLocation.back]: [],
                        }
                    }
                }],
                name: 'squad1-A',
            }],
            'team2': [{
                entities: [{
                    playerID: 2, stats: getDummyStats(), team: 'team2', name: 'tc2_1_1', logicType: 'Adjust_Weapon_Test',
                    startingLocation: SquadEntityInSquadLocation.middle,
                }, {
                    playerID: 3, stats: getDummyStats(), team: 'team2', name: 'tc2_1_2', logicType: 'Adjust_Weapon_Test',
                    startingLocation: SquadEntityInSquadLocation.back,
                }],
                name: 'squad2-A'
            }]
        }
    })
    sb.squadActions()
}

// test_fixedsequence()
// test_simpleautobattle();
test_readjustweapon();