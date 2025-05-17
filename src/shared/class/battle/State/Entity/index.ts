import { atom, Atom } from "@rbxts/charm";
import { Reality } from "shared/class/battle/types";
import { calculateRealityValue, extractMapValues } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus } from "../../Events/EventBus";
import { UNIVERSAL_PHYS } from "../../Systems/CombatSystem/Ability/const";
import { AbilityConfig, AbilitySet, AbilitySetDefinition, AbilityType, ActiveAbilityConfig, ActiveAbilityState } from "../../Systems/CombatSystem/Ability/types";
import Armour from "../../Systems/CombatSystem/Armour";
import FightingStyle from "../../Systems/CombatSystem/FightingStyle";
import { AGGRESSIVE_STANCE, BASIC_STANCE, DEFENSIVE_STANCE } from "../../Systems/CombatSystem/FightingStyle/const";
import Weapon from "../../Systems/CombatSystem/Weapon";
import { EntityChangeable, EntityConfig, EntityStance, EntityState, EntityStats } from "./types";

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
    private logger = Logger.createContextLogger("Entity");

    qr: Vector2;
    armed?: keyof typeof Enum.KeyCode;
    team?: string;

    // Fighting style properties
    private fightingStyles: FightingStyle[] = [];
    private activeStyleIndex: number = 0;

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
        this.weapon = options.weapon ? new Weapon(options.weapon) : Weapon.Unarmed();
        this.armour = options.armour ? new Armour(options.armour) : Armour.Unprotected();

        // Initialize with default fighting styles
        this.initializeFightingStyles(options.fightingStyles);
    }
    private initializeFightingStyles(configStyles?: FightingStyle[]) {
        // Add default fighting styles if none provided
        if (!configStyles || configStyles.size() === 0) {
            this.fightingStyles = [
                BASIC_STANCE(),
                AGGRESSIVE_STANCE(),
                DEFENSIVE_STANCE()
            ];
        } else {
            this.fightingStyles = configStyles;
        }

        this.logger.info(`${this.name} initialized with ${this.fightingStyles.size()} fighting styles`);
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
            activeStyleIndex: this.activeStyleIndex,
            fightingStyles: this.fightingStyles.map(style => style.getState())
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
        const availableAbilities = this.getAvailableAbilities();

        // Create a definition first
        const abilitySetDef: AbilitySetDefinition = {};

        // Populate the definition based on available abilities
        if (availableAbilities.size() >= 1) abilitySetDef.Q = availableAbilities[0];
        if (availableAbilities.size() >= 2) abilitySetDef.W = availableAbilities[1];
        if (availableAbilities.size() >= 3) abilitySetDef.E = availableAbilities[2];
        if (availableAbilities.size() >= 4) abilitySetDef.R = availableAbilities[3];        // Check if there are no keys in the ability set definition
        let isEmpty = true;
        for (const [_, __] of pairs(abilitySetDef)) {
            isEmpty = false;
            break;
        }

        if (isEmpty) {
            // Fallback to a default ability if none are available
            const defaultAbility = this.getAllAbilities().find(a => a.type === AbilityType.Active) as ActiveAbilityConfig;
            if (defaultAbility) {
                abilitySetDef.Q = defaultAbility;
            }
        }        // Convert to AbilitySet
        const abilitySet = {} as AbilitySet;
        for (const [key, value] of pairs(abilitySetDef)) {
            // In Roblox's Luau, we can assign directly without defineProperty
            (abilitySet as any)[key] = value;
        }

        return [abilitySet];
    }

    getAllAbilities(): Array<AbilityConfig> {
        // Get abilities from all fighting styles
        const allAbilities: AbilityConfig[] = [];

        this.fightingStyles.forEach(style => {
            style.getActiveAbilities().forEach(ability => {
                allAbilities.push(ability.getState() as ActiveAbilityConfig);
            });
        });

        // If no fighting style abilities are available, use default universal abilities
        if (allAbilities.size() === 0) {
            const uniPhysAbilities = extractMapValues(UNIVERSAL_PHYS);
            return uniPhysAbilities;
        }

        return allAbilities;
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

        // Get a reaction ability from the current fighting style
        const activeStyle = this.getActiveStyle();
        return activeStyle.getRandomReactionAbility();
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

    //#region Fighting Style Methods
    public getActiveStyle(): FightingStyle {
        return this.fightingStyles[this.activeStyleIndex];
    }

    public getFightingStyles(): FightingStyle[] {
        return [...this.fightingStyles];
    }

    public switchFightingStyle(styleIndex: number): boolean {
        if (styleIndex < 0 || styleIndex >= this.fightingStyles.size() || styleIndex === this.activeStyleIndex) {
            this.logger.warn(`${this.name} cannot switch to fighting style ${styleIndex}: invalid index`);
            return false;
        }

        const newStyle = this.fightingStyles[styleIndex];
        const switchCost = newStyle.getSwitchCost();

        // Check if entity has enough posture to switch
        if (this.pos() < switchCost) {
            this.logger.warn(`${this.name} cannot switch to ${newStyle.getName()}: not enough posture (${this.pos()} < ${switchCost})`);
            return false;
        }

        // Pay the posture cost
        this.set('pos', this.pos() - switchCost);

        // Switch to new style
        this.activeStyleIndex = styleIndex;
        this.logger.info(`${this.name} switched to fighting style: ${newStyle.getName()}`);
        return true;
    }

    public useAbility(abilityName: string) {
        const activeStyle = this.getActiveStyle();
        const ability = activeStyle.useAbility(abilityName);

        if (!ability) {
            this.logger.warn(`${this.name} failed to use ability ${abilityName}`);
            return undefined;
        }

        // Apply ability costs
        const abilityCost = ability.getState().cost;
        for (const [stat, cost] of pairs(abilityCost)) {
            if (this[stat]) {
                this.set(stat as EntityChangeable, this.get(stat as EntityChangeable) - cost);
            }
        }

        this.logger.info(`${this.name} used ability ${abilityName}`);
        return ability;
    }

    public getAvailableAbilities(): ActiveAbilityConfig[] {
        const activeStyle = this.getActiveStyle();
        return activeStyle.getAvailableAbilities().map(ability => ability.getState() as ActiveAbilityConfig);
    }

    public recycleAbilities(): void {
        const activeStyle = this.getActiveStyle();
        activeStyle.recycleAbilities();
        this.logger.info(`${this.name} recycled all abilities for style: ${activeStyle.getName()}`);
    }
    //#endregion
}