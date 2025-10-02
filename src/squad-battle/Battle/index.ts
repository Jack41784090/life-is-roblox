import Logger from "shared/utils/Logger";
import { SquadEntity } from "squad-battle/Entity";
import { uniformRandom } from '../../shared/utils/index';
import { Squad } from "../Squad";
import { EntityUpdate, SquadBattleConfig } from "../type";
import { iSquadBattle } from "./type.d";

export class SquadBattle implements iSquadBattle {
    getEntityByID(affected: number): SquadEntity {
        for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
            const squadsCount = squads.size();
            for (let i = 0; i < squadsCount; i++) {
                const squad = squads[i];
                for (let j = 0; j < squad.entities.size(); j++) {
                    const entity = squad.entities[j];
                    if (entity.playerID === affected) {
                        return entity;
                    }
                }
            }
        }
        throw `Entity with ID ${affected} not found!`;
    }
    removeCapitulatedEntities(_lastRoundCapitulatedEntities: Set<SquadEntity>) {
        _lastRoundCapitulatedEntities.forEach(e => {
            for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
                const squadsCount = squads.size();
                for (let i = 0; i < squadsCount; i++) {
                    const squad = squads[i];
                    squad.entities.forEach((se, i) => {
                        if (se.playerID === e.playerID) {
                            squad.entities.remove(i);
                            this.logger.warn(`Entity ${se.playerID} has capitulated and left the battle!`);
                        }
                    });
                }
            }
        })
    }
    logger = Logger.createContextLogger("SquadBattle");
    teamsAndSquads: Record<string, Squad[]> = {};
    private teamNames: string[] = [];

    constructor(config: SquadBattleConfig) {
        for (const [tn, sc] of pairs(config.teams)) {
            this.teamsAndSquads[tn] = sc.map(sc => new Squad(sc));
            this.teamNames.push(tn);
        }
    }


    /**
     * Get all squads from enemy teams (excluding current team)
     * @param currentTeamName - The team name to exclude
     * @returns Array of all enemy squads
     */
    private getAllEnemySquads(currentTeamName: string): Squad[] {
        const enemySquads: Squad[] = [];
        for (const teamName of this.teamNames) {

            if (teamName !== currentTeamName) {
                this.teamsAndSquads[teamName].forEach(s => {
                    enemySquads.push(s);
                });
            }
        }
        return enemySquads;
    }

    /**
     * Choose enemy squad with weighted selection based on squad health/strength
     * @param currentTeamName - The team name to exclude
     * @returns Squad selected based on weighted criteria
     */
    private chooseWeightedEnemySquad(currentTeamName: string): Squad | undefined {
        const enemySquads = this.getAllEnemySquads(currentTeamName);
        let result: Squad | undefined = undefined;

        if (enemySquads.size() > 0) {
            // Weight selection based on squad average HP (prioritize weaker squads)
            const weights = enemySquads.map(squad => {
                const totalHP = squad.entities.reduce((sum, entity) =>
                    sum + entity.get_changeableStat_num('HP'), 0
                );
                const avgHP = totalHP / squad.entities.size();
                // Lower HP = higher weight (more likely to be chosen)
                return math.max(1, 100 - avgHP);
            });

            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            const randomValue = uniformRandom(0, totalWeight - 1);

            let currentWeight = 0;
            let selectedSquad: Squad | undefined = undefined;

            for (let i = 0; i < enemySquads.size(); i++) {
                currentWeight += weights[i];
                if (randomValue < currentWeight && !selectedSquad) {
                    selectedSquad = enemySquads[i];
                }
            }

            // Use selected squad or fallback to last squad if something goes wrong
            result = selectedSquad || enemySquads[enemySquads.size() - 1];
        }

        return result;
    }

    checkTeamStrength(teamName: string) {
        return this.teamsAndSquads[teamName].reduce((A, squad) => {
            return A + squad.entities.reduce((_A, se) => {
                return _A + se.get_changeableStat_num('HP');
            }, 0)
        }, 0);
    }

    checkVictory() {
        let aliveTeams = 0, deadTeams = 0;
        for (const [teamsName, squads] of pairs(this.teamsAndSquads)) {
            const teamStrength = this.checkTeamStrength(teamsName);
            if (teamStrength <= 0) {
                deadTeams++;
                // delete this.teamsAndSquads[teamsName];
            }
            else {
                aliveTeams++;
            }
        }

        this.logger.debug(`Check victory: alive[${aliveTeams}] dead[${deadTeams}]`)
        return aliveTeams <= 1;
    }

    roundCount: number = -1;

    public squadRecoveries() {
        for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
            const squadsCount = squads.size();
            for (let i = 0; i < squadsCount; i++) {
                const squad = squads[i];
                if (squad.get_lastAttackedAtRound() < this.roundCount) {
                    squad.recovery();
                }
            }
        }
    }

    public squadActions() {
        const updates: EntityUpdate[] = [];
        const squadUpdateRecords: Record<string, EntityUpdate[][]> = {};
        for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
            const squadsCount = squads.size();
            const targetSquads = this.getAllEnemySquads(teamName);
            for (let i = 0; i < squadsCount; i++) {
                const squad = squads[i];
                const squadUpdate = squad.round(targetSquads, this.roundCount);


                // === === 
                squadUpdateRecords[teamName] = squadUpdateRecords[teamName] || [];
                if (squadUpdate) {
                    squadUpdateRecords[teamName].push(squadUpdate);
                    squadUpdate.forEach(u => updates.push(u));
                }
            }
        }

        print(`--- Round ${this.roundCount} Updates ---`);
        for (const [teamName, sur] of pairs(squadUpdateRecords)) {
            print(`Team: ${teamName}`);
            for (let i = 0; i < sur.size(); i++) {
                const su = sur[i];
                print(` Squad ${i + 1}:`);
                for (let j = 0; j < su.size(); j++) {
                    const u = su[j];
                    let changeStr = "";
                    let valueStr = "";
                    switch (u.change.property) {
                        case 'HP':
                        case 'ORG':
                            changeStr = `${u.change.property} ${u.change.from} -> ${u.change.to}`;

                            break;
                        case 'DIE':
                        case 'RETREAT':
                        case 'LEAVE':
                            changeStr = u.change.property;
                            break;
                        case 'LOC':
                            changeStr = `LOC ${u.change.from} -> ${u.change.to}`;
                            break;
                    }
                    print(`  - ${u.source} -> ${u.affected}: ${changeStr}`);
                }
            }
        }
        print('------------------------------');

        return updates;
    }

    public removeDeadEntities() {
        for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
            const squadsCount = squads.size();
            for (let i = 0; i < squadsCount; i++) {
                const squad = squads[i];
                squad.entities.forEach((se, i) => {
                    if (se.get_changeableStat_num('HP') === 0) {
                        squad.entities.remove(i);
                    }
                });
            }
        }
    }
}
