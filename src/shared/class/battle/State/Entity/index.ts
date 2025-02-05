import { atom, Atom } from "@rbxts/charm";
import { UNIVERSAL_PHYS } from "shared/const/assets";
import { Reality } from "shared/types/battle-types";
import { calculateRealityValue, extractMapValues } from "shared/utils";
import { AbilitySet, AbilityType, ActiveAbilityState, iAbility, iActiveAbility } from "../Ability/types";
import FightingStyle from "../FightingStyle";
import { Default } from "../FightingStyle/const";
import { EntityChangeable, EntityInit, EntityStance, EntityState, EntityStats, EntityStatsUpdate, EntityUpdate, iEntity } from "./types";


export default class Entity implements iEntity {
    // server-controlled properties
    public playerID: number;
    public stats: EntityStats;
    public name: string;
    private sta: Atom<number>;
    private hip: Atom<number>;
    private org: Atom<number>;
    private pos: Atom<number>;
    private mana: Atom<number>;

    private stance: EntityStance = EntityStance.High;
    private fightingStyle: FightingStyle = Default();

    qr: Vector2;
    armed?: keyof typeof Enum.KeyCode;
    team?: string;

    constructor(options: EntityInit) {
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
    }

    state(): EntityState {
        return {
            playerID: this.playerID,
            stats: {
                ...this.stats,
            },
            team: this.team,
            name: this.name,
            armed: this.armed,
            sta: this.sta(),
            hip: this.hip(),
            org: this.org(),
            pos: this.pos(),
            mana: this.mana(),
            qr: this.qr,
            stance: this.stance,
        }
    }

    //#region get stats
    set(property: EntityChangeable, by: number) {
        print(`${this.name}: Changing ${property} by ${by}`);
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
            'Q': tempFirst as iActiveAbility,
            'W': tempFirst as iActiveAbility,
            'E': tempFirst as iActiveAbility,
            'R': tempFirst as iActiveAbility,
        };
        return [setOne];
    }

    getAllAbilities(): Array<iAbility> {
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
            warn(`[Entity] ${this.name} is not able to react to ${incomingAbility.name} because it has no user`);
            return;
        }
        if (target?.playerID !== this.playerID) {
            warn(`[Entity] ${this.name} is not able to react to ${incomingAbility.name} because it is not the target`);
            return;
        }

        // const matchingDirection = target.stance === hittingDirection;
        return this.fightingStyle.getRandomReactionAbility();
    }
    //#endregion

    //#region Modifying
    public changeHP(num: number) {
        print(`${this.name}: Changing HP by ${num}`);

        this.hip = atom(this.hip() + num);
        const maxHP = calculateRealityValue(Reality.HP, this.stats);
        const hpPercentage = 0.9 - math.clamp((this.hip() / maxHP) * .9, 0, .9); print(hpPercentage)
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
        for (const [stat, value] of pairs(u)) {
            if (this.stats[stat] === undefined) {
                warn(`Stat ${stat} not found`);
                continue;
            }
            if (typeOf(stat) === 'string' && typeOf(value) === 'number') {
                this.stats[stat] = value;
            }
        }
    }
    public update(u: EntityUpdate) {
        print(`Updating entity ${this.name} with`, u);
        if (u.stats) this.updateStats(u.stats);
        for (const [k, v] of pairs(u)) {
            if (this[k as keyof this] === undefined) continue;
            switch (k) {
                case 'hip':
                case 'sta':
                case 'org':
                case 'pos':
                case 'mana':
                    print(`Changing ${k} by ${v}`);
                    this[k as EntityChangeable](v as number);
                    break;
                default:
                    print(`Changing ${k} to ${v}`);
                    this[k as keyof this] = v as unknown as any;
            }
        }
    }
    public setStance(stance: EntityStance) {
        this.stance = stance;
    }

    public setCell(q: number, r: number): void;
    public setCell(qr: Vector2): void
    public setCell(q: number | Vector2, r?: number) {
        if (typeOf(q) === 'number') {
            this.qr = new Vector2(q as number, r as number);
        } else {
            this.qr = q as Vector2;
        }
    }
    //#endregion
}