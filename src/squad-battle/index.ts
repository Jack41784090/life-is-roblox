import { Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { DamageRecord, EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, SquadEntityInSquadLocation } from "./type";
// import { DamageRecord, EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, SquadEntityInSquadLocation } from ".";
import { uniformRandom } from '../shared/utils/index';

export class SquadEntity {
    private logger: ContextLogger;
    public readonly playerID: number;

    public name: string;

    public readonly stats: EntityBaseStats;
    public readonly changeableStats: EntityChangeableStats;

    // equipments
    // public armour: Armour;
    // public weapon: Weapon;
    public team: string;

    constructor(options: EntityConfig) {
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.changeableStats = { ...options.changeableStats }
        this.name = options.name ?? `unknown-${options.playerID}-${options.stats.id}`;
        this.logger = Logger.createContextLogger(`Entity:${this.name}[${this.playerID}]`)
        // this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        // this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();
    }

    public getCeiling_changeableStat(property: EntityChangeable) {
        switch (property) {
            case 'HP': return this.calculateRealityValue(Reality.HP);
            case 'ORG': return this.calculateRealityValue(Reality.Guts);
            case 'LOC': return SquadEntityInSquadLocation.back;
            default: return 1000;
        }
    }

    public mod_changeableStat(property: EntityChangeable, by: number) {
        // this.logger.debug(`${this.name}: Changing ${property} by ${by}`);
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        changeable[property](math.clamp(oldValue + by, 0, this.getCeiling_changeableStat(property)));
        return oldValue;
    }

    public set_changeableStat(property: EntityChangeable, to: number) {
        // this.logger.debug(`${this.name}: Changing ${property} by ${by}`);
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        changeable[property](math.clamp(to, 0, this.getCeiling_changeableStat(property)))
        return oldValue;
    }

    public get_changeableStat_num(property: EntityChangeable): number {
        return this.get_changeableStat_atm(property)();
    }

    public get_changeableStat_atm(property: EntityChangeable): Atom<number> {
        const changeable = this.changeableStats;
        return changeable[property];
    }

    public heal(num: number) {
        if (num < 0) return;
        this.mod_changeableStat('HP', num)
    }

    private _deorgAfterDamage(dm: number) {
        this.mod_changeableStat('ORG', -(dm * 1.5));
        if (this.get_changeableStat_num('ORG') <= 0) {
            this.mod_changeableStat('LOC', 1);
            this.set_changeableStat('ORG', this.getCeiling_changeableStat('ORG') * 0.1)
        }
    }

    public recover() {
        this.mod_changeableStat('ORG', 7)
        this.heal(1);
    }

    public damage(num: number) {
        if (num < 0) return;
        this.logger.debug("taking damage: " + num);
        this.mod_changeableStat('HP', -num);
        this._deorgAfterDamage(num);
    }

    // squad-based chooser functions
    public chooseTarget(enemy_squad: Squad) {
        // Thinking process:
        // 1. Where am I right now?
        const myLocation = this.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        // 2. Where are my enemies right now? and how are they doing?
        const squadEnemies = enemy_squad.get_allEntities();
        const frontLineEnemies = squadEnemies[SquadEntityInSquadLocation.front];
        const frontlineNumbers = frontLineEnemies?.size() || 0;
        // 3. Who is the easy target? What is defined as a "easy target"?
        let myTarget: SquadEntity | undefined;
        switch (myLocation) {
            // I am at the frontlines, so my priority should be those in front of me
            case SquadEntityInSquadLocation.front:
                myTarget = frontLineEnemies?.[uniformRandom(0, frontlineNumbers - 1)];
                break;
            // case
        }

        this.logger.debug(`chosetarget: ${myTarget?.name || "cannot"}`);
        return myTarget;
    }

    calculateRealityValue(reality: Reality): number {
        const stats = this.stats;
        switch (reality) {
            case Reality.HP:
                return (stats.end * 5) + (stats.siz * 2);
            case Reality.Force:
                return (stats.str * 2) + (stats.spd * 1) + (stats.siz * 1);
            case Reality.Guts:
                return stats.wil * stats.fai;
            case Reality.Mana:
                return (stats.int * 3) + (stats.spr * 2) + (stats.fai * 1);
            case Reality.Spirituality:
                return (stats.spr * 2) + (stats.fai * 2) + (stats.wil * 1);
            case Reality.Divinity:
                return (stats.fai * 3) + (stats.wil * 2) + (stats.cha * 1);
            case Reality.Precision:
                return (stats.dex * 2) + (stats.acr * 1) + (stats.spd * 1);
            case Reality.Maneuver:
                return (stats.acr * 2) + (stats.spd * 2) + (stats.dex * 1);
            case Reality.Convince:
                return (stats.cha * 2) + (stats.beu * 1) + (stats.int * 1);
            case Reality.Bravery:
                return (stats.wil * 2) + (stats.end * 1) + (stats.fai * 1);
            default:
                this.logger.warn(`Reality value for ${reality} not found`, "RealityCalculations");
                return 0;
        }
    }
}

export class Squad {
    team: string = '';
    logger: ContextLogger;
    entities: SquadEntity[];
    name: string;

    // initiative: number;
    // organisation: number;
    // antiair: number;

    constructor(configs: SquadConfig) {
        this.entities = configs.entities.map(c => new SquadEntity(c))
        this.name = configs.name;
        this.logger = Logger.createContextLogger(`Squad:${configs.name}`);
        this.team = configs.team || '';
    }

    get_allEntities(): Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>> {
        return this.entities.reduce((A, se) => {
            const loc = se.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
            if (A[loc]?.size()) {
                // size is not 0 or null
                A[loc].push(se)
            }
            else {
                A[loc] = [se]
            }
            return A;
        }, {} as Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>>)
    }

    get_damageRecord(): DamageRecord {
        return {};
    }

    recovery() {
        this.logger.debug("offered a recovery")
        this.entities.forEach(e => e.recover());
    }

    private _lastRoundReceivedAttack: number = -1;
    receiveAttack(from: Squad, roundCount: number) {
        this._lastRoundReceivedAttack = roundCount;
        const squadsize = from.entities.size();
        for (let i = 0; i < squadsize; i++) {
            const attackingEntity = from.entities[i];
            const targetEntity = attackingEntity.chooseTarget(this);
            if (targetEntity) {
                targetEntity.damage(10);
            }
        }
    }

    get_lastAttackedAtRound() {
        return this._lastRoundReceivedAttack;
    }

    private chooseEnemySquad(enemySquads: Squad[]): Squad | undefined {
        let chosenSquad: Squad | undefined = undefined;
        if (enemySquads.size() > 0) {
            chosenSquad = enemySquads[uniformRandom(0, enemySquads.size() - 1)];
        }
        return chosenSquad;
    }

    private act_attackRandom(targetableSquads: Squad[], roundCount: number) {
        // 1. Choose enemy squad
        const enemySquad = this.chooseEnemySquad(targetableSquads);

        // 2. Attack enemy squad
        if (enemySquad) {
            this._lastRoundReceivedAttack = roundCount;
            this.logger.debug("Attacking " + enemySquad.name);
            enemySquad.receiveAttack(this, roundCount);
        }
    }

    private act_idle() {
        this.logger.debug("idling")
    }

    round(enemySquads: Squad[], roundCount: number) {
        const random = math.random();
        if (random >= .5) {
            this.act_attackRandom(enemySquads, roundCount);
        }
        else {
            this.act_idle();
        }
    }
}

enum SquadLocation {
    front = 1,
    back,
}

type SquadConfig = {
    entities: EntityConfig[];
    name: string;
    team?: string;
}

type SquadBattleConfig = {
    squads: Record<string, SquadConfig[]>;
}

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
