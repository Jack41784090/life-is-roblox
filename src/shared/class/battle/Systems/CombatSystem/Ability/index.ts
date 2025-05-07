import Logger from "shared/utils/Logger";
import Entity from "../../../State/Entity";
import { EntityStance } from "../../../State/Entity/types";
import { AbilityConfig, AbilityState, AbilityType, ActiveAbilityConfig, ActiveAbilityState, DamageType, Potency, PreReactionClashResult, ReactionUpdate, ReactiveAbilityConfig, ReactiveAbilityState } from "./types";

class Ability {
    protected logger = Logger.createContextLogger("Ability");

    //#region flair info
    protected icon: string;
    protected animation: string;
    protected name: string;
    protected description: string;
    //#endregion

    //#region hard info
    protected direction: EntityStance;
    protected type: AbilityType;
    protected cost: { pos: number; mana: number; };
    protected dices: number[];
    protected using?: Entity;
    protected target?: Entity;
    //#endregion

    constructor(opt: AbilityConfig) {
        this.type = AbilityType.None
        this.icon = opt.icon;
        this.animation = opt.animation;
        this.name = opt.name;
        this.description = opt.description;
        this.direction = opt.direction;
        this.cost = opt.cost;
        this.dices = opt.dices;

        if (opt.using) this.using = opt.using;
        if (opt.target) this.target = opt.target;

        this.logger.debug(`Created ability ${this.name} of type ${this.type}`, {
            direction: this.direction,
            cost: this.cost,
            dices: this.dices,
            usingEntity: this.using?.name,
            targetEntity: this.target?.name
        });
    }

    getState() {
        this.logger.debug(`Getting state for ability ${this.name}`);
        return {
            ... this,
            using: this.using?.state(),
            target: this.target?.state(),
        } as unknown as AbilityState;
    }
}

export class ActiveAbility extends Ability {
    protected range: NumberRange;
    protected potencies: Map<Potency, number>;
    protected damageType: Map<DamageType, number>;

    constructor(opt: ActiveAbilityConfig) {
        super({ ...opt, type: AbilityType.Active });
        this.type = AbilityType.Active;
        this.damageType = opt.damageType;
        this.range = opt.range;
        this.potencies = opt.potencies;

        // Convert Maps to array of key-value pairs for logging
        const potenciesArray: [Potency, number][] = [];
        this.potencies.forEach((value, key) => potenciesArray.push([key, value]));

        const damageTypesArray: [DamageType, number][] = [];
        this.damageType.forEach((value, key) => damageTypesArray.push([key, value]));

        this.logger.debug(`Created ActiveAbility ${this.name}`, {
            range: [this.range.Min, this.range.Max],
            potencies: potenciesArray,
            damageTypes: damageTypesArray
        });
    }

    public getTotalDamageArray(): Record<DamageType, number> {
        this.logger.debug(`Calculating total damage array for ${this.name}`);
        const rawTotalDamage = this.getRawTotalDamage();
        const result = {} as Record<DamageType, number>;
        this.damageType.forEach((perc, dtype) => {
            const damageValue = rawTotalDamage * perc / 100;
            result[dtype] = damageValue;
            this.logger.debug(`Damage for type ${dtype}: ${rawTotalDamage} * ${perc}% = ${damageValue}`);
        });
        this.logger.debug(`Final damage array:`, result);
        return result;
    }

    public getRawTotalDamage() {
        this.logger.debug(`Calculating raw total damage for ${this.name}`);
        if (this.using === undefined) {
            this.logger.warn("No attacker entity set for ability");
            return 0;
        }
        const attacker = this.using!;

        let damage = 0;
        const damagePotencies = attacker.weapon.getPotencyArrayDamage(attacker);
        this.logger.debug(`Weapon potency array:`, damagePotencies);

        this.potencies.forEach((perc, pot) => {
            const potencyValue = damagePotencies[pot] || 0;
            const damageValue = potencyValue * perc / 100;
            damage += damageValue;
            this.logger.debug(`Potency ${pot}: ${potencyValue} * ${perc}% = ${damageValue}`);
        });

        this.logger.debug(`Total raw damage: ${damage}`);
        return damage;
    }

    override getState(): ActiveAbilityState {
        return {
            ... super.getState(),
            range: this.range,
            potencies: this.potencies,
            damageType: this.damageType,
        } as unknown as ActiveAbilityState;
    }
}

export class ReactiveAbility extends Ability {
    protected type = AbilityType.Reactive;
    protected successReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    protected failureReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    protected getSuccessChance: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => number;

    defendAttemptSuccessful: boolean = false;

    constructor(opt: ReactiveAbilityConfig) {
        super({ ...opt, type: AbilityType.Reactive });
        this.successReaction = opt.successReaction;
        this.failureReaction = opt.failureReaction;
        this.getSuccessChance = opt.getSuccessChance;
        this.logger.debug(`Created ReactiveAbility ${this.name}`);
    }

    react(againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) {
        this.logger.debug(`${this.name} reacting to ${againstAbility.name}`);
        const successChance = this.getSuccessChance(againstAbility, clashResult);
        this.logger.debug(`Success chance: ${successChance}%`);
        const roll = math.random(100);
        this.logger.debug(`Reaction roll: ${roll}`);

        if (roll <= successChance) {
            this.defendAttemptSuccessful = true;
            this.logger.info(`Reaction SUCCESSFUL: ${this.name} against ${againstAbility.name}`);
            const reaction = this.successReaction(againstAbility, clashResult);
            this.logger.debug(`Success reaction result:`, reaction);
            return reaction;
        } else {
            this.defendAttemptSuccessful = false;
            this.logger.info(`Reaction FAILED: ${this.name} against ${againstAbility.name}`);
            const reaction = this.failureReaction(againstAbility, clashResult);
            this.logger.debug(`Failure reaction result:`, reaction);
            return reaction;
        }
    }

    override getState(): ReactiveAbilityState {
        return {
            ... super.getState(),
            successReaction: this.successReaction,
            failureReaction: this.failureReaction,
            getSuccessChance: this.getSuccessChance,
        }
    }
}
