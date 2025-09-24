import Logger from "shared/utils/Logger";
import { uniformRandom } from '../shared/utils/index';
import { Squad } from "./Squad";
import { SquadBattleConfig } from "./type";






export class SquadBattle {
    logger = Logger.createContextLogger("SquadBattle");
    teamsAndSquads: Record<string, Squad[]> = {};
    private teamNames: string[] = [];

    constructor(config: SquadBattleConfig) {
        for (const [tn, sc] of pairs(config.squads)) {
            this.teamsAndSquads[tn] = sc.map(sc => new Squad(sc));
        }
        // Cache team names for efficient lookup
        this.teamNames = [];
        for (const [teamName] of pairs(this.teamsAndSquads)) {
            this.teamNames.push(teamName);
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
    round() {
        this.roundCount++;

        // 1. All squads make their moves
        for (const [teamName, squads] of pairs(this.teamsAndSquads)) {
            const squadsCount = squads.size();
            const targetSquads = this.getAllEnemySquads(teamName);
            for (let i = 0; i < squadsCount; i++) {
                const squad = squads[i];
                squad.round(targetSquads, this.roundCount);
            }
        }

        // 2. Recovery for those who didn't attack
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

    autoBattle() {
        while (this.checkVictory() === false) {
            this.round();
        }
    }
}
