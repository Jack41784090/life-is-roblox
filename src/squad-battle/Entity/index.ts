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


    // misc.
    private _isRetreating: boolean = false;

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

    public newRoundReset() {
        this._isRetreating = false;
    }

    public isDead(): boolean {
        return this.get_changeableStat_num('HP') <= 0;
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

        // this.logger.debug(`${property}: ${oldValue} ==> ${newValue}`);

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
        if (num < 0 || this.isDead()) return;
        return this.mod_changeableStat('HP', num)
    }

    public boost(num: number): EntityChange | undefined {
        if (num < 0 || this.isDead()) return;
        return this.mod_changeableStat('ORG', num)
    }

    private _deorgAfterDamage(dm: number, source: number): EntityUpdate[] {
        if (dm <= 0) return [];
        if (this.isDead()) return [];
        // Deorg = base damage * 1.5 + (current HP / max HP) * 10
        // Minimum deorg is 5
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
            if (this._isRetreating === false) {
                this._isRetreating = true;
                changes.push({ source: affected, affected, change: this.mod_changeableStat('LOC', 1) },
                    { source: affected, affected, change: this.mod_changeableStat('ORG', this.calculateRealityValue(Reality.Guts) * .1) });
            }
        }

        return changes;
    }

    public recover(): EntityChange[] {
        if (this.isDead()) return [];
        const recoverUpdates: EntityChange[] = [];
        const logic = new Frontline({ entity: this, enemy_squad: {}, our_squad: {} });
        const idle_logic = logic.choose_action();
        switch (idle_logic) {
            case 'forward':
                recoverUpdates.push(this.mod_changeableStat('LOC', -1));
                break;
            case 'retreat':
                recoverUpdates.push(this.mod_changeableStat('LOC', 1));
                break;
        }
        recoverUpdates.push(this.mod_changeableStat('HP', 3));
        recoverUpdates.push(this.mod_changeableStat('ORG', 5));
        return recoverUpdates;
    }

    public damage(num: number, source: number): EntityUpdate[] {
        if (this.isDead()) return [];
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
            // this.logger.debug("taking damage: " + num);
            const x = [
                { source, affected, change: this.mod_changeableStat('HP', -num) },
            ]
            if (this.get_changeableStat_num('HP') === 0) {
                x.push({ source, affected, change: { property: 'DIE', from: -1, to: -1 } })
            }
            else {
                this._deorgAfterDamage(num, source).forEach(u => x.push(u));
            }
            return x;
        }
    }

    public calculateRealityValue(reality: Reality): number {
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

    private action_attack(logic: Logic) {
        const target = logic.choose_target();
        if (target) {
            const dm = 5;
            const damageUpdate: EntityUpdate[] = target.damage(dm, this.playerID);
            return damageUpdate
            // this.logger.debug(`Attacked ${target.name} for ${dm} damage`);
        }
    }

    private action_forward(logic: Logic) {
        return [{
            source: this.playerID,
            affected: this.playerID,
            change: this.mod_changeableStat('LOC', -1)
        }]
    }

    private action_heal(logic: Logic) {
        const physicalheal = 5;
        const spiritheal = 7;
        const samelineallies = logic.get_samelineAllies();
        if (samelineallies?.size()) {
            const ally = samelineallies[uniformRandom(0, samelineallies.size() - 1, true)];

            const h = ally.heal(physicalheal);
            const b = ally.boost(spiritheal);
            const updates: EntityUpdate[] = [];
            h ? updates.push({ source: this.playerID, affected: ally.playerID, change: h }) : undefined;
            b ? updates.push({ source: this.playerID, affected: ally.playerID, change: b }) : undefined;
            return updates;
        }
    }

    private action_retreat() {
        if (this._isRetreating === false) {
            this._isRetreating = true;
            return [{
                source: this.playerID,
                affected: this.playerID,
                change: this.mod_changeableStat('LOC', 1)
            }];
        }
        return [];
    }

    private action_capitulate() {
        return [{
            source: this.playerID,
            affected: this.playerID,
            change: {
                property: 'LEAVE' as EntityChangeable,
                from: -1,
                to: -1
            }
        }];
    }

    private action_idle() {
        // this.logger.debug("idling")
        return this.recover()
    }

    public action(ourSquad: SquadMetadata, enemySquad: SquadMetadata): EntityUpdate[] {
        if (this.isDead()) return [];
        const updates: EntityUpdate[] = [];
        const logic = new Frontline({
            entity: this,
            enemy_squad: enemySquad,
            our_squad: ourSquad
        });
        const action = logic.choose_action();
        switch (action) {
            case 'attack':
                this.action_attack(logic)?.forEach(eu => updates.push(eu))
                break;

            case 'forward':
                this.action_forward(logic).forEach(eu => updates.push(eu))
                break;

            case 'heal':
                this.action_heal(logic)?.forEach(eu => updates.push(eu))
                break;

            case 'idle':
                this.action_idle().forEach(c => updates.push({
                    source: this.playerID,
                    affected: this.playerID,
                    change: c
                }))
                break;
        }

        return updates;
    }

    public reaction(our_squad: SquadMetadata, enemy_squad: SquadMetadata): EntityUpdate[] {
        if (this.isDead()) return [];
        const updates: EntityUpdate[] = [];
        const logic = new Frontline({
            entity: this,
            our_squad,
            enemy_squad
        })
        const reaction = logic.choose_reaction();
        switch (reaction) {
            case 'attack':
                this.action_attack(logic)?.forEach(eu => updates.push(eu))
                break;

            case 'forward':
                this.action_forward(logic).forEach(eu => updates.push(eu))
                break;

            case 'heal':
                this.action_heal(logic)?.forEach(eu => updates.push(eu))
                break;

            case 'idle':
                this.action_idle().forEach(c => updates.push({
                    source: this.playerID,
                    affected: this.playerID,
                    change: c
                }))
                break;

            case 'retreat':
                this.logger.warn("retreating!");
                this.action_retreat().forEach(eu => updates.push(eu))
                updates.push({
                    source: this.playerID,
                    affected: this.playerID,
                    change: {
                        property: 'RETREAT' as EntityChangeable,
                        from: -1,
                        to: -1
                    }
                })
                break;

            case 'capitulate':
                this.logger.warn("capitulating!");
                this.action_capitulate().forEach(eu => updates.push(eu))
                break;
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
    'heal' |
    'capitulate'

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
    get_samelineAllies() {
        const myLocation = this.entity.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        return this.context.our_squad[myLocation];
    }
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
        const frontLineEnemies = context.enemy_squad[SquadEntityInSquadLocation.front]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const frontlineNumbers = frontLineEnemies?.size() || 0;
        const midlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.middle]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const midlineNumbers = midlineEnemies?.size();
        const backlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.back]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const backlineNumbers = backlineEnemies?.size();

        // 3. Where are my allies right now? and how are they doing?
        const frontlineAllies = context.our_squad[SquadEntityInSquadLocation.front]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const frontlineAlliesNumbers = frontlineAllies?.size();
        const midlineAllies = context.our_squad[SquadEntityInSquadLocation.middle]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const midlineAlliesNumbers = midlineAllies?.size();
        const backlineAllies = context.our_squad[SquadEntityInSquadLocation.back]?.filter(e => e.get_changeableStat_num('HP') > 0);
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

    protected healOthersIfAround(): SquadEntityAction | undefined {
        const mylocation = this.situation.myLocation;
        let allies: SquadEntity[] | undefined;
        this.context.our_squad[mylocation] && (allies = this.context.our_squad[mylocation]);
        if (allies?.size()) {
            return 'heal';
        }
        return undefined;
    }

    protected retreatIfOutnumbered(): SquadEntityAction | undefined {
        const { myLocation, frontlineAlliesNumbers, frontlineNumbers, midlineAlliesNumbers, midlineNumbers, backlineAlliesNumbers, backlineNumbers } = this.situation;
        let myAllies = (frontlineAlliesNumbers || 0) + (midlineAlliesNumbers || 0) + (backlineAlliesNumbers || 0);
        let myEnemies = (frontlineNumbers || 0) + (midlineNumbers || 0) + (backlineNumbers || 0);
        if (myEnemies > myAllies * 2) {
            if (myLocation === SquadEntityInSquadLocation.back) {
                return 'capitulate';
            }
            return 'retreat';
        }
        return undefined;
    }

    public choose_reaction(): SquadEntityAction {
        const { myLocation, backlineAllies, backlineAlliesNumbers } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.back:
                if (this.entity.get_changeableStat_num('ORG') === 0) {
                    return 'capitulate'
                }
            default:
                return this.retreatIfOutnumbered() || this.healOthersIfAround() || 'idle'
        }
    }

    public choose_action(): SquadEntityAction {
        const { myLocation, backlineAllies, backlineAlliesNumbers } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.back:
                if (this.entity.get_changeableStat_num('ORG') === 0) {
                    return 'idle'
                }
            default:
                return this.healOthersIfAround() || 'idle'
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

    public override choose_action() {
        const { myLocation } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_action();
        }
    }

    public override choose_reaction() {
        const { myLocation } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_reaction();
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

        // this.logger.debug(`chosetarget: ${myTarget?.name || "cannot"}`);
        return myTarget;
    }
}

class Absurd extends Logic {
    constructor(context: LogicContext) {
        super(context);
    }

    public override choose_action() {
        return 'forward' as SquadEntityAction;
    }

    public override choose_reaction() {
        return 'retreat' as SquadEntityAction;
    }
}
