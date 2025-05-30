import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { PassiveEffectType } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import { uniformRandom } from "shared/utils";
import Logger from "shared/utils/Logger";
import State from "../../State";
import Entity from "../../State/Entity";
import { AttackAction, PlayerID } from "../../types";
import { NeoClashResult, StrikeSequence, StrikeSequenceResult, StrikeSequenceRoll } from "./types";

export default class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    private gameState: State;
    constructor(gameState: State) {
        this.gameState = gameState;
    }

    private tireAttacker(attacker: Entity, ability: ActiveAbilityState) {
        for (const [stat, modifier] of pairs(ability.cost)) {
            attacker.set(stat, attacker.get(stat) - modifier);
        }
    }

    private tireDefender(defender: Entity, ability: ActiveAbilityState) {
        // defender.set('pos', defender.get('pos') - ability.cost.pos);
    }

    private getPassiveEffectValue(entity: Entity, effectType: PassiveEffectType): number {
        // Safely checks if an entity has a fighting style and returns the passive effect value
        if (entity.getActiveStyle !== undefined) {
            try {
                const style = entity.getActiveStyle();
                return style.getPassiveEffectValue(effectType);
            } catch (err) {
                this.logger.warn(`Error getting passive effect ${effectType} from entity ${entity.name}:`, err as defined);
            }
        }
        return 0;
    }

    private calculateModifiedDamage(damage: number, attacker: Entity, target: Entity): number {
        const damageIncrease = this.getPassiveEffectValue(attacker, PassiveEffectType.IncreaseDamageDealt);
        const damageReduction = this.getPassiveEffectValue(target, PassiveEffectType.ReduceDamageReceived);
        let modifiedDamage = damage + damageIncrease - damageReduction;
        modifiedDamage = math.max(1, modifiedDamage);
        return modifiedDamage;
    }

    private rebuildAbility(abilityState: ActiveAbilityState, by: PlayerID, against: PlayerID) {
        const allEntities = this.gameState.getEntityManager().getAllEntities();
        const ability = new ActiveAbility({
            ...abilityState,
            using: allEntities.find((e: Entity) => e.playerID === by),
            target: allEntities.find((e: Entity) => e.playerID === against),
        });
        return ability;
    }

    public resolveAttack(action: AttackAction): StrikeSequence[] {
        const [attacker, target] = this.gameState.getAttackerAndDefender(action);
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return [];
        }

        // initialise the dices
        const abilityDices = action.ability.dices.map(d => d);
        let dice = abilityDices.pop();
        const strikeSequences: StrikeSequence[] = [];

        // Loop through all dices and resolve the strike sequence
        while (dice) {
            const result: StrikeSequence = this.resolveStrikeSequence([dice], attacker, target);
            strikeSequences.push(result);
            dice = abilityDices.pop();
        }

        const attackingAbility = this.rebuildAbility(action.ability, action.by, action.against!);
        return strikeSequences.map(ss => {
            return ss.map(clash => {
                const damage = this.calculateDamage(attackingAbility);
                clash.result.damage = this.calculateModifiedDamage(damage, attacker, target);
                // clash.clashKills = this.isAttackKills(target.playerID, clash);
                return clash;
            });
        });
    }

    public applyAttack(clashes: StrikeSequence[], ability: ActiveAbility) {
        const [attacker, defender] = this.gameState.getAttackerAndDefender(ability);
        if (!attacker || !defender) {
            this.logger.error("Attacker or defender not found", attacker, defender);
            return;
        }
        for (const sequence of clashes) {
            for (const clash of sequence) {
                const { against, fate } = clash.result;
                if (against === "PV" && fate === "Hit") {
                    defender.damage(clash.result.damage || 0);
                }
            }
        }

        this.tireAttacker(attacker, ability.getState());
        this.tireDefender(defender, ability.getState());

    }

    private performRoll(
        dicePool: number[],
        targetValue: number,
        bonus: number,
        checkType: "DV" | "PV",
        attacker: Entity,
        target: Entity
    ): StrikeSequenceResult {
        let die = dicePool.pop();
        const results: StrikeSequenceRoll[] = [];
        let overallSuccess = false;
        while (die !== undefined) {
            const roll = math.floor(uniformRandom(1, die + 1));

            let adjustedBonus = bonus;
            let adjustedTarget = targetValue;

            adjustedBonus += this.getPassiveEffectValue(attacker, checkType === "DV" ? PassiveEffectType.AdjustHit : PassiveEffectType.AdjustPen);
            adjustedBonus += this.getPassiveEffectValue(target, checkType === "DV" ? PassiveEffectType.AdjustEnemyHit : PassiveEffectType.AdjustEnemyPen);
            adjustedTarget += this.getPassiveEffectValue(attacker, checkType === "DV" ? PassiveEffectType.AdjustEnemyDV : PassiveEffectType.AdjustEnemyPV);
            adjustedTarget += this.getPassiveEffectValue(target, checkType === "DV" ? PassiveEffectType.AdjustDV : PassiveEffectType.AdjustPV);

            const totalRoll = roll + adjustedBonus;
            const success = totalRoll >= adjustedTarget;
            overallSuccess = overallSuccess || success;

            const rollResult: NeoClashResult = {
                armour: target.armour.getState(),
                weapon: attacker.weapon.getState(),
                // ability: attacker.weapon.getAbility(), // Assuming you might want to add ability context here
                result: {
                    die: `d${die}`,
                    against: checkType,
                    toSurmount: targetValue,
                    roll: roll,
                    bonus: bonus,
                    fate: success ? "Hit" : "Miss",
                    damage: undefined
                },
                clashKills: false, // Assuming clashKills is false for misses
            };

            results.push({
                rollResult,
                success,
                diceUsed: die
            })
            die = dicePool.pop();
        }

        return {
            sequence: results,
            success: overallSuccess,
        };
    }

    private resolveStrikeSequence(initialAbilityDices: number[], attacker: Entity, target: Entity): StrikeSequence {
        const rollHistory: StrikeSequence = [];
        const availableDice = [...initialAbilityDices];

        // Perform DV check first
        const dv = target.armour?.getDV() || 0;
        const bonusHit = attacker.weapon?.getTotalHitValue(attacker) || 0;
        const sequenceToHitResult = this.performRoll([...availableDice], dv, bonusHit, "DV", attacker, target);
        sequenceToHitResult.sequence.forEach(sequenceRoll => rollHistory.push(sequenceRoll.rollResult))

        // all dices failed to hit
        if (!sequenceToHitResult.success) {
            return rollHistory;
        }

        // Use remaining dice for penetration check
        const pv = target.armour?.getPV() || 0;
        const bonusPen = attacker.weapon?.getTotalPenetrationValue(attacker) || 0;
        const sequenceToPenetrateResult = this.performRoll([...availableDice], pv, bonusPen, "PV", attacker, target);
        sequenceToPenetrateResult.sequence.forEach(sequenceRoll => rollHistory.push(sequenceRoll.rollResult));

        return rollHistory;
    }

    private calculateDamage(ability: ActiveAbility): number {
        const [attacker, defender] = this.gameState.getAttackerAndDefender(ability)
        if (!attacker || !defender) {
            this.logger.error("Attacker or defender not found", attacker, defender);
            return 0;
        }
        return this.calculateModifiedDamage(defender.armour.getRawDamageTaken(ability.getTotalDamageArray()), attacker, defender);
    }

    private isAttackKills(against: number, clash: NeoClashResult) {
        const target = this.gameState.getEntity(against);
        const { result } = clash
        if (!target) return false;

        if (result.fate === "Miss" || result.fate === "Cling") {
            return false;
        }

        const targetHp = target.get('hip') || 0;
        // const damage = this.calculateDamage({
        //     against,
        //     attacker,
        //     defender,
        //     ability
        // });
        // return targetHp <= damage;
    }
}

