import Entity from "../Entity";
import { EntityStance } from "../Entity/types";
import { potencyMap } from "./const";
import { AbilityConfig, AbilityDamageType, AbilityPotency, AbilityState, AbilityType, ActiveAbilityConfig, ActiveAbilityState, iAbility, iActiveAbility, iReactiveAbility, PreReactionClashResult, ReactionUpdate, ReactiveAbilityConfig, ReactiveAbilityState } from "./types";

class Ability implements iAbility {
    //#region flair info
    icon: string;
    animation: string;
    name: string;
    description: string;
    //#endregion

    //#region hard info
    direction: EntityStance;
    type: AbilityType = AbilityType.None;
    chance: number;
    cost: { pos: number; mana: number; };
    using?: Entity;
    target?: Entity;
    //#endregion

    constructor(opt: AbilityConfig) {
        this.direction = opt.direction;
        this.chance = opt.chance;
        this.name = opt.name;
        this.description = opt.description;
        this.cost = opt.cost;
        this.using = opt.using;
        this.target = opt.target;
        this.animation = opt.animation;
        this.icon = opt.icon;
    }

    getState(): AbilityState {
        return {
            ... this,
            using: this.using?.state(),
            target: this.target?.state(),
        }
    }
}

export class ActiveAbility extends Ability implements iActiveAbility {
    type = AbilityType.Active;
    range: NumberRange;
    potencies: Map<AbilityPotency, number>;
    damageType: Map<AbilityDamageType, number>;

    constructor(opt: ActiveAbilityConfig) {
        super({ ...opt, type: AbilityType.Active });
        this.damageType = opt.damageType;
        this.range = opt.range;
        this.potencies = opt.potencies;
    }

    calculateDamage() {
        if (this.using === undefined) return 0;

        let damage = 0;
        this.potencies.forEach((value, key) => {
            const p = potencyMap[key];
            p.forEach(([stat, modifier]) => {
                const st = this.using!.stats[stat];
                if (typeIs(st, "number")) {
                    damage += st * modifier * value;
                }
            });
        });
        return damage;
    }

    override getState(): ActiveAbilityState {
        return {
            ... super.getState(),
            range: this.range,
            potencies: this.potencies,
            damageType: this.damageType,
        }
    }
}

export class ReactiveAbility extends Ability implements iReactiveAbility {
    type = AbilityType.Reactive;
    successReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    failureReaction: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => ReactionUpdate;
    getSuccessChance: (againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) => number;

    defendAttemptSuccessful: boolean = false;

    constructor(opt: ReactiveAbilityConfig) {
        super({ ...opt, type: AbilityType.Reactive });
        this.successReaction = opt.successReaction;
        this.failureReaction = opt.failureReaction;
        this.getSuccessChance = opt.getSuccessChance;
    }

    react(againstAbility: ActiveAbilityState, clashResult: PreReactionClashResult) {
        const successChance = this.getSuccessChance(againstAbility, clashResult);
        const roll = math.random(100);

        if (roll <= successChance) {
            this.defendAttemptSuccessful = true;
            return this.successReaction(againstAbility, clashResult);
        } else {
            this.defendAttemptSuccessful = false;
            return this.failureReaction(againstAbility, clashResult);
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
