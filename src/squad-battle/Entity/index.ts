import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityConfig, EntityUpdate, SquadEntityInSquadLocation } from "squad-battle/type";
import { EntityChange } from '../type';

// ENTITY //

type SquadMetadata = Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>>;

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

    public getFloor_changeableStat(property: EntityChangeable) {
        switch (property) {
            case 'LOC': return SquadEntityInSquadLocation.front;
            default: return 0;
        }
    }

    public mod_changeableStat(property: EntityChangeable, by: number): EntityChange {
        return this.set_changeableStat(property, this.get_changeableStat_num(property) + by);
    }

    public set_changeableStat(property: EntityChangeable, to: number): EntityChange {
        const changeable = this.changeableStats;
        const oldValue = changeable[property]();
        const newValue = math.clamp(to,
            this.getFloor_changeableStat(property),
            this.getCeiling_changeableStat(property));
        changeable[property](newValue)

        this.logger.debug(`${property}: ${oldValue} ==> ${newValue}`);

        return {
            from: oldValue,
            to: newValue,
            property,
        };
    }

    public get_changeableStat_num(property: EntityChangeable): number {
        return this.get_changeableStat_atm(property)();
    }

    public get_changeableStat_atm(property: EntityChangeable): Atom<number> {
        const changeable = this.changeableStats;
        return changeable[property];
    }

    public heal(num: number): EntityChange | undefined {
        if (num < 0) return;
        return this.mod_changeableStat('HP', num)
    }

    public boost(num: number): EntityChange | undefined {
        if (num < 0) return;
        return this.mod_changeableStat('ORG', num)
    }

    private _deorgAfterDamage(dm: number, source: number): EntityUpdate[] {
        const affected = this.playerID;
        const baseDamageDeorg = -(dm * 1.5);
        const closeToDeathDeorg = -(this.get_changeableStat_num('HP') / this.getCeiling_changeableStat('HP')) * 10;
        const changes: EntityUpdate[] = [
            {
                source,
                affected,
                change: this.mod_changeableStat('ORG', baseDamageDeorg + closeToDeathDeorg)
            }
        ]
        if (this.get_changeableStat_num('ORG') <= 0) {
            changes.push(
                { source: affected, affected, change: this.mod_changeableStat('LOC', 1) },
                { source: affected, affected, change: this.set_changeableStat('ORG', this.getCeiling_changeableStat('ORG') * 0.1) }
            )
        }

        return changes;
    }

    public recover() {
        this.mod_changeableStat('ORG', 7)
        this.heal(1);
    }

    public damage(num: number, source: number): EntityUpdate[] {
        const oldHP = this.get_changeableStat_num('HP');
        const affected = this.playerID
        if (num <= 0) {
            return [{
                source,
                affected,
                change: {
                    property: 'HP',
                    from: oldHP,
                    to: oldHP,
                }
            }]
        }
        else {
            this.logger.debug("taking damage: " + num);
            const x = [
                { source, affected, change: this.mod_changeableStat('HP', -num) },
            ]
            this._deorgAfterDamage(num, source).forEach(u => x.push(u));
            return x;
        }
    }

    private calculateRealityValue(reality: Reality): number {
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

    public attack(ourSquad: SquadMetadata, enemySquad: SquadMetadata): EntityUpdate[] {
        const updates: EntityUpdate[] = [];
        const logic = new Frontline({
            entity: this,
            enemy_squad: enemySquad,
            our_squad: ourSquad
        });
        const action = logic.choose_action();
        switch (action) {
            case 'attack': {
                const target = logic.choose_target();
                if (target) {
                    const dm = 5;
                    const damageUpdate: EntityUpdate[] = target.damage(dm, this.playerID);
                    damageUpdate.forEach(eu => updates.push(eu))
                    // updates.push(damageUpdate);
                    this.logger.debug(`Attacked ${target.name} for ${dm} damage`);
                }
                break;
            }

            case 'forward': {
                this.mod_changeableStat('LOC', -1);
                break;
            }

            case 'retreat': {
                this.mod_changeableStat('LOC', 1);
                break;
            }

            case 'idle': {
                this.logger.debug("idling")
                break;
            }

            case 'heal': {
                const physicalheal = 5;
                const spiritheal = 7;
                const samelineallies = ourSquad[this.get_changeableStat_num('LOC') as SquadEntityInSquadLocation];
                if (samelineallies?.size()) {
                    const ally = samelineallies[uniformRandom(0, samelineallies.size() - 1, true)];

                    let heal;
                    if (heal = ally.heal(physicalheal)) {
                        updates.push({
                            source: this.playerID,
                            affected: ally.playerID,
                            change: heal,
                        });
                    }
                    let boost;
                    if (boost = ally.boost(spiritheal)) {
                        updates.push({
                            source: this.playerID,
                            affected: ally.playerID,
                            change: boost
                        })
                    }
                }
            }
        }

        return updates;
    }
}


// LOGIC //

type SquadEntityAction = |
    'idle' |
    'forward' |
    'retreat' |
    'attack' |
    'heal';

type SquadBattleSituation = {
    myLocation: SquadEntityInSquadLocation;
    frontlineAllies: SquadEntity[] | undefined;
    frontlineAlliesNumbers: number | undefined;
    midlineAllies: SquadEntity[] | undefined;
    midlineAlliesNumbers: number | undefined;
    backlineAllies: SquadEntity[] | undefined;
    backlineAlliesNumbers: number | undefined;

    frontLineEnemies: SquadEntity[] | undefined;
    frontlineNumbers: number;
    midlineEnemies: SquadEntity[] | undefined;
    midlineNumbers: number | undefined;
    backlineEnemies: SquadEntity[] | undefined;
    backlineNumbers: number | undefined;
}

type LogicContext = {
    entity: SquadEntity;
    enemy_squad: Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>>;
    our_squad: Partial<Record<SquadEntityInSquadLocation, SquadEntity[]>>;
}

class Logic {
    protected logger: ContextLogger;
    protected entity: SquadEntity;
    protected situation: SquadBattleSituation;
    protected context: LogicContext;
    protected constructor(context: LogicContext) {
        this.context = context;
        this.entity = context.entity;
        this.logger = Logger.createContextLogger(this.entity.name + "--logic")
        this.situation = this.accessSituation(context);
    }

    protected accessSituation(context: LogicContext): SquadBattleSituation {
        // 1. Where am I right now?
        const myLocation = this.entity.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        // 2. Where are my enemies right now? and how are they doing?
        const frontLineEnemies = context.enemy_squad[SquadEntityInSquadLocation.front];
        const frontlineNumbers = frontLineEnemies?.size() || 0;
        const midlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.middle];
        const midlineNumbers = midlineEnemies?.size();
        const backlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.back];
        const backlineNumbers = backlineEnemies?.size();

        // 3. Where are my allies right now? and how are they doing?
        const frontlineAllies = context.our_squad[SquadEntityInSquadLocation.front];
        const frontlineAlliesNumbers = frontlineAllies?.size();
        const midlineAllies = context.our_squad[SquadEntityInSquadLocation.middle];
        const midlineAlliesNumbers = midlineAllies?.size();
        const backlineAllies = context.our_squad[SquadEntityInSquadLocation.back];
        const backlineAlliesNumbers = backlineAllies?.size();

        return this.situation = {
            myLocation,
            frontlineAllies,
            frontlineAlliesNumbers,
            midlineAllies,
            midlineAlliesNumbers,
            backlineAllies,
            backlineAlliesNumbers,
            frontLineEnemies,
            frontlineNumbers,
            midlineEnemies,
            midlineNumbers,
            backlineEnemies,
            backlineNumbers
        }
    }

    public choose_target(): SquadEntity | undefined {
        return undefined;
    }
}

class Frontline extends Logic {

    constructor(context: LogicContext) {
        super(context);
    }

    private forwardIfBrave(): SquadEntityAction | undefined {
        if (this.entity.get_changeableStat_num('ORG') / this.entity.getCeiling_changeableStat('ORG') > 0.5) {
            return 'forward' as SquadEntityAction;
        }
        return undefined;
    }

    private healOthersIfAround(): SquadEntityAction | undefined {
        const mylocation = this.situation.myLocation;
        let allies: SquadEntity[] | undefined;
        this.context.our_squad[mylocation] && (allies = this.context.our_squad[mylocation]);
        if (allies?.size()) {
            return 'heal';
        }
        return undefined;
    }

    public choose_action() {
        const { myLocation } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || this.healOthersIfAround() || 'idle';
        }
    }

    public override choose_target() {
        // Thinking process:
        const { myLocation, frontLineEnemies, frontlineNumbers, midlineEnemies, midlineNumbers, backlineEnemies, backlineNumbers } = this.situation;

        let myTarget: SquadEntity | undefined;
        switch (myLocation) {
            // I am at the frontlines, so my priority should be those in front of me
            case SquadEntityInSquadLocation.front:
                myTarget = frontLineEnemies?.[uniformRandom(0, frontlineNumbers - 1, true)] ||
                    midlineEnemies?.[uniformRandom(0, (midlineNumbers || 1) - 1, true)] ||
                    backlineEnemies?.[uniformRandom(0, (backlineNumbers || 1) - 1, true)];
                break;

            // i should be at the frontline!
            default:
                break;
        }

        this.logger.debug(`chosetarget: ${myTarget?.name || "cannot"}`);
        return myTarget;
    }
}

class Backline extends Logic {

}
