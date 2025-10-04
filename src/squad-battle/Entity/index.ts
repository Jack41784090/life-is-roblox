import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/Systems/CombatSystem/types";
import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import Armour from "squad-battle/Armour";
import { iArmour } from "squad-battle/Armour/type";
import { EntityBaseStats, EntityChangeable, EntityChangeableStats, EntityUpdate, SquadEntityInSquadLocation } from "squad-battle/type";
import Weapon from "squad-battle/Weapon";
import { iWeapon } from "squad-battle/Weapon/type";
import { EntityChange } from '../type';
import { iLogic } from './Logic/type.d';
import { EntityConfig, iSquadEntity, SquadMetadata } from './type.d';

// ENTITY //

export class SquadEntity implements iSquadEntity {
    private logger: ContextLogger;
    public readonly playerID: number;
    public name: string;
    public readonly stats: EntityBaseStats;
    public readonly changeableStats: EntityChangeableStats;
    private logic!: iLogic;

    // equipments
    public armour: iArmour;
    public weapon: iWeapon;
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
            LOC: atom(options.startingLocation ?? this.getCeiling_changeableStat('LOC')),
        }
        this.name = options.name ?? `unknown-${options.playerID}-${options.stats.id}`;
        this.logger = Logger.createContextLogger(`Entity:${this.name}[${this.playerID}]`)
        this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();
    }

    public setLogic(logic: iLogic) {
        this.logic = logic;
    }

    public newRoundReset() {
        this._isRetreating = false;
    }

    public isDead(): boolean {
        return this.get_changeableStat_num('HP') <= 0;
    }

    public get_armour() {
        return this.armour;
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


        // /// temp log:
        // if (property === 'LOC' && to === 1) this.logger.warn("entity shfited to frontlines")

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
        // const idle_logic = this.logic.updateSituation({
        //     entity: this,
        //     enemy_squad: {},
        //     our_squad: {},
        // }).choose_action();
        // switch (idle_logic) {
        //     case 'forward':
        //         recoverUpdates.push(this.mod_changeableStat('LOC', -1));
        //         break;
        //     case 'retreat':
        //         recoverUpdates.push(this.mod_changeableStat('LOC', 1));
        //         break;
        // }
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

    private action_attack(logic: iLogic) {
        const target = logic.choose_target();
        if (target) {
            const weapon = logic.choose_weapon();
            const armour = target.get_armour();
            const dm = armour.getRawDamageTaken(weapon.getPotencyArrayDamage(this))
            const damageUpdate: EntityUpdate[] = target.damage(dm, this.playerID);
            return damageUpdate
            // this.logger.debug(`Attacked ${target.name} for ${dm} damage`);
        }
    }

    private action_forward(logic: iLogic) {
        return [{
            source: this.playerID,
            affected: this.playerID,
            change: this.mod_changeableStat('LOC', -1)
        }]
    }

    private action_heal(logic: iLogic) {
        const physicalheal = 5;
        const spiritheal = 7;
        const samelineallies = this.logic.get_sameLineAllies();
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

        this.logger.debug("deciding action...")
        const updates: EntityUpdate[] = [];
        const logic = this.logic.updateSituation({
            entity: this,
            enemy_squad: enemySquad,
            our_squad: ourSquad
        });
        const action = logic.choose_action();

        this.logger.debug(`|| Chose action: ${action}`)
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

    public reaction(our_squad: SquadMetadata, enemy_squad: SquadMetadata): EntityUpdate[] {
        if (this.isDead()) return [];

        this.logger.debug("deciding reaction...")
        const updates: EntityUpdate[] = [];
        const logic = this.logic.updateSituation({
            entity: this,
            our_squad,
            enemy_squad
        })
        const reaction = logic.choose_reaction();
        this.logger.debug(`|| Chose reaction: ${reaction}`)
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
