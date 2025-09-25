import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, SquadEntityInSquadLocation } from "squad-battle/type";

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
        this.changeableStats = {
            HP: atom(this.getCeiling_changeableStat('HP')),
            STA: atom(this.getCeiling_changeableStat('STA')),
            ORG: atom(this.getCeiling_changeableStat('ORG')),
            POS: atom(this.getCeiling_changeableStat('POS')),
            MAG: atom(this.getCeiling_changeableStat('MAG')),
            LOC: atom(this.getCeiling_changeableStat('LOC')),
        }
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
            default: return 100;
        }
    }

    public mod_changeableStat(property: EntityChangeable, by: number) {
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        const newValue = math.clamp(oldValue + by, 0, this.getCeiling_changeableStat(property))
        changeable[property](newValue);

        this.logger.debug(`${property}: ${oldValue} =mod=> ${newValue}`);
        return oldValue;
    }

    public set_changeableStat(property: EntityChangeable, to: number) {
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        const newValue = math.clamp(to, 0, this.getCeiling_changeableStat(property));
        changeable[property](newValue)

        this.logger.debug(`${property}: ${oldValue} =set=> ${newValue}`);
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