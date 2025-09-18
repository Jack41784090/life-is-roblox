import { Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import { DamageRecord, EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, SquadEntityInSquadLocation } from "./type";
// import { DamageRecord, EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, SquadEntityInSquadLocation } from ".";
import { uniformRandom } from '../shared/utils/index';

export class SquadEntity {
    private logger = Logger.createContextLogger("Entity");
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
        // this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        // this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();
    }

    public set_changeableStat(property: EntityChangeable, to: number) {
        // this.logger.debug(`${this.name}: Changing ${property} by ${by}`);
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        changeable[property](math.max(0, to));
        return oldValue;
    }

    public get_changeableStat_num(property: EntityChangeable): number {
        return this.get_changeableStat_atm(property)();
    }

    public get_changeableStat_atm(property: EntityChangeable): Atom<number> {
        const changeable = this.changeableStats;
        return changeable[property];
    }

    public changeHP(num: number) {
        // this.logger.debug(`${this.name}: Changing HP by ${num}`);

        const oldHp = this.changeableStats.HP();
        this.changeableStats.HP(this.changeableStats.HP() + num);
        const maxHP = calculateRealityValue(Reality.HP, this.stats);
        const hpPercentage = 0.9 - math.clamp((this.changeableStats.HP() / maxHP) * .9, 0, .9);
        // this.logger.debug(`HP percentage: ${hpPercentage}`);
    }

    public heal(num: number) {
        if (num < 0) return;
        this.changeHP(num);
    }

    public damage(num: number) {
        if (num < 0) return;
        this.changeHP(-num);
    }

    // squad-based chooser functions
    public chooseTarget(enemy_squad: Squad) {
        // Thinking process:
        // 1. Where am I right now?
        const myLocation = this.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        // 2. Where are my enemies right now? and how are they doing?
        const squadEnemies = enemy_squad.get_allEntities();
        const frontlineNumbers = squadEnemies[1]?.size() || 0;
        // 3. Who is the easy target? What is defined as a "easy target"?
        switch (myLocation) {
            // I am at the frontlines, so my priority should be those in front of me
            case SquadEntityInSquadLocation.front:
                return squadEnemies[1]?.[uniformRandom(0, frontlineNumbers)];
            // case
        }
    }
}

export class Squad {
    entities: SquadEntity[];

    // initiative: number;
    // organisation: number;
    // antiair: number;

    constructor(configs: SquadConfig) {
        this.entities = configs.entities.map(c => new SquadEntity(c))
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

    takeDamage(from: Squad) {
        const squadsize = from.entities.size();
        for (let i = 0; i < squadsize; i++) {
            const e = from.entities[i];
            const hurting = e.chooseTarget(this);
            hurting?.damage(10);
        }
    }
}

enum SquadLocation {
    front = 1,
    back,
}

type SquadConfig = {
    entities: EntityConfig[];
}

type SquadBattleConfig = {
    squads: Record<string, SquadConfig[]>;
}

class SquadBattle {
    teamsAndSquads: Record<string, Squad[]> = {};
    constructor(config: SquadBattleConfig) {
        for (const [tn, sc] of pairs(config.squads)) {
            this.teamsAndSquads[tn] = sc.map(sc => new Squad(sc));
        }
    }
}
