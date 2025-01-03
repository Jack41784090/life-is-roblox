import { atom, Atom } from "@rbxts/charm";
import { UNIVERSAL_PHYS } from "shared/const/assets";
import { AbilitySet, EntityInit, EntityState, EntityStats, EntityStatsUpdate, iAbility, iEntity, Reality } from "shared/types/battle-types";
import { calculateRealityValue, extractMapValues } from "shared/utils";


export default class Entity implements iEntity {
    // server-controlled properties
    playerID: number;
    stats: EntityStats;
    name: string;
    private sta: Atom<number>;
    private hip: Atom<number>;
    private org: Atom<number>;
    private pos: Atom<number>;

    qr?: Vector2;
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
        this.name = options.name ?? `unknown-${options.playerID}-${options.stats.id}`;
    }

    info(): EntityState {
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
            qr: this.qr,
        }
    }

    //#region get stats
    change(property: 'sta' | 'hip' | 'org' | 'pos', by: number) {
        this[property](by);
        return this[property];
    }

    get(property: 'sta' | 'hip' | 'org' | 'pos'): number {
        return this[property]();
    }

    getState(property: 'sta' | 'hip' | 'org' | 'pos'): Atom<number> {
        return this[property];
    }
    //#endregion

    //#region get abilities
    getAllAbilitySets(): Array<AbilitySet> {
        const allAbilities = this.getAllAbilities();
        const setOne: AbilitySet = {
            'Q': allAbilities[0] as Required<iAbility>,
            'W': allAbilities[0] as Required<iAbility>,
            'E': allAbilities[0] as Required<iAbility>,
            'R': allAbilities[0] as Required<iAbility>,
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
    //#endregion

    //#region Modifying
    public changeHP(num: number) {
        print(`${this.name}: Changing HP by ${num}`);

        this.hip = atom(this.hip() + num);
        const maxHP = calculateRealityValue(Reality.HP, this);
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
    public update(u: EntityState) {
        print(`Updating entity ${this.name} with`, u);
        if (u.stats) this.updateStats(u.stats);
        for (const [k, v] of pairs(u)) {
            if (this[k as keyof this] === undefined) continue;
            if (typeOf(v) === typeOf(this[k as keyof this])) {
                this[k as keyof this] = v as unknown as any;
            }
        }
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