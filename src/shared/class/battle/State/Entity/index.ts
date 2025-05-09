import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/types";
import { calculateRealityValue, extractMapValues } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus, GameEvent } from "../../Events/EventBus";
import { UNIVERSAL_PHYS } from "../../Systems/CombatSystem/Ability/const";
import { AbilityConfig, AbilitySet, AbilityType, ActiveAbilityConfig, ActiveAbilityState } from "../../Systems/CombatSystem/Ability/types";
import Armour from "../../Systems/CombatSystem/Armour";
import { ArmourConfig } from "../../Systems/CombatSystem/Armour/types";
import Weapon from "../../Systems/CombatSystem/Weapon";
import { WeaponConfig } from "../../Systems/CombatSystem/Weapon/types";
import { EntityChangeable, EntityConfig, EntityStance, EntityState, EntityStats, EntityStatsUpdate, EntityUpdate } from "./types";

export default class Entity {
    // server-controlled properties
    public playerID: number;
    public stats: EntityStats;
    public name: string;
    private sta: Atom<number>;
    private hip: Atom<number>;
    private org: Atom<number>;
    private pos: Atom<number>;
    private mana: Atom<number>;

    public armour: Armour;
    public weapon: Weapon;

    private stance: EntityStance = EntityStance.High;
    private eventBus?: EventBus;
    private logger = Logger.createContextLogger("Entity");

    qr: Vector2;
    armed?: keyof typeof Enum.KeyCode;
    team?: string;

    constructor(options: EntityConfig, eventBus?: EventBus) {
        this.qr = options.qr;
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = atom(options.sta ?? 0);
        this.hip = atom(options.hip ?? 0);
        this.org = atom(options.org ?? 0);
        this.pos = atom(options.pos ?? 0);
        this.mana = atom(options.mana ?? 0);
        this.name = options.name ?? `unknown-${options.playerID}-${options.stats.id}`;
        this.eventBus = eventBus;
        this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();

    }

    state(): EntityState {
        return {
            name: this.name,
            stance: this.stance,
            playerID: this.playerID,
            qr: this.qr,
            stats: {
                ...this.stats,
            },
            sta: this.sta(),
            hip: this.hip(),
            org: this.org(),
            pos: this.pos(),
            mana: this.mana(),
            weapon: this.weapon.getState(),
            armour: this.armour.getState(),
        }
    }

    //#region get stats
    set(property: EntityChangeable, by: number) {
        this.logger.debug(`${this.name}: Changing ${property} by ${by}`);
        const oldValue = this[property]();
        this[property](math.max(0, by));


        return this[property];
    }

    get(property: EntityChangeable): number {
        return this[property]();
    }

    getState(property: EntityChangeable): Atom<number> {
        return this[property];
    }
    //#endregion

    //#region get abilities
    getAllAbilitySets(): Array<AbilitySet> {
        const allAbilities = this.getAllAbilities();
        const tempFirst = allAbilities.find(a => a.type === AbilityType.Active);
        const setOne: AbilitySet = {
            'Q': tempFirst as ActiveAbilityConfig,
            'W': tempFirst as ActiveAbilityConfig,
            'E': tempFirst as ActiveAbilityConfig,
            'R': tempFirst as ActiveAbilityConfig,
        };
        return [setOne];
    }

    getAllAbilities(): Array<AbilityConfig> {
        const uniPhysAbilities = extractMapValues(UNIVERSAL_PHYS);
        return uniPhysAbilities;
    }

    getEquippedAbilitySet() {
        const sets = this.getAllAbilitySets();
        return sets[0];
    }

    getReaction(incomingAbility: ActiveAbilityState) {
        const { direction: hittingDirection, using, target, type: abilityType } = incomingAbility;
        assert(abilityType === AbilityType.Active, `Ability ${incomingAbility.name} is not an active ability`);
        if (using === undefined) {
            this.logger.warn(`${this.name} is not able to react to ${incomingAbility.name} because it has no user`);
            return;
        }
        if (target?.playerID !== this.playerID) {
            this.logger.warn(`${this.name} is not able to react to ${incomingAbility.name} because it is not the target`);
            return;
        }

        // const matchingDirection = target.stance === hittingDirection;
        // return this.fightingStyle.getRandomReactionAbility();
    }
    //#endregion

    //#region Modifying
    public changeHP(num: number) {
        this.logger.debug(`${this.name}: Changing HP by ${num}`);

        const oldHip = this.hip();
        this.hip(this.hip() + num);
        const maxHP = calculateRealityValue(Reality.HP, this.stats);
        const hpPercentage = 0.9 - math.clamp((this.hip() / maxHP) * .9, 0, .9);
        this.logger.debug(`HP percentage: ${hpPercentage}`);
    }
    public heal(num: number) {
        if (num < 0) return;
        this.changeHP(num);
    }
    public damage(num: number) {
        if (num < 0) return;
        this.changeHP(-num);
    }
    public updateStats(u: EntityStatsUpdate) {
        let changed = false;

        for (const [stat, value] of pairs(u)) {
            if (this.stats[stat] === undefined) {
                this.logger.warn(`Stat ${stat} not found`);
                continue;
            }
            if (typeOf(stat) === 'string' && typeOf(value) === 'number') {
                this.stats[stat] = value;
                changed = true;
            }
        }
    }
    public update(u: EntityUpdate) {
        this.logger.debug(`Updating entity ${this.name} with`, u);
        let changed = false;

        if (u.stats) {
            this.updateStats(u.stats);
            changed = true;
        }

        for (const [k, v] of pairs(u)) {
            if (this[k as keyof this] === undefined) continue;

            switch (k) {
                case 'hip':
                case 'sta':
                case 'org':
                case 'pos':
                case 'mana':
                    this.logger.debug(`Changing ${k} by ${v}`);
                    this[k as EntityChangeable](v as number);
                    changed = true;
                    break;

                case 'weapon':
                    this.logger.debug(`Changing weapon to ${v}`);
                    this.weapon = new Weapon(v as WeaponConfig);
                    changed = true;
                    break;
                case 'armour':
                    this.logger.debug(`Changing armour to ${v}`);
                    this.armour = new Armour(v as ArmourConfig);
                    changed = true;
                    break;

                default:
                    this.logger.debug(`Changing ${k} to ${v}`);
                    this[k as keyof this] = v as unknown as any;
                    changed = true;
            }
        }
    }
    public setStance(stance: EntityStance) {
        if (this.stance === stance) return;
        this.stance = stance;
    }

    public setCell(q: number, r: number): void;
    public setCell(qr: Vector2): void
    public setCell(q: number | Vector2, r?: number) {
        const oldPosition = new Vector2(this.qr.X, this.qr.Y);

        if (typeOf(q) === 'number') {
            this.qr = new Vector2(q as number, r as number);
        } else {
            this.qr = q as Vector2;
        }

        // Emit entity moved event if EventBus is available and position changed
        if (this.eventBus && oldPosition && oldPosition !== this.qr) {
            this.eventBus.emit(GameEvent.ENTITY_MOVED, {
                entityId: this.playerID,
                from: oldPosition,
                to: this.qr
            });
        }
    }
    //#endregion
}