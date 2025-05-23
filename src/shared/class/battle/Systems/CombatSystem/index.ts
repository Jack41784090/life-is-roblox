import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { PassiveEffectType } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import { AttackAction, NeoClashResult, PlayerID } from "shared/class/battle/types";
import { uniformRandom } from "shared/utils";
import Logger from "shared/utils/Logger";
import State from "../../State";
import Entity from "../../State/Entity";

export default class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    constructor(
        private gameState: State,
    ) { }

    private tireAttacker(attacker: Entity, ability: ActiveAbilityState) {
        for (const [stat, modifier] of pairs(ability.cost)) {
            attacker.set(stat, attacker.get(stat) - modifier);
        }
    }

    private tireDefender(defender: Entity, ability: ActiveAbilityState) {
        defender.set('pos', defender.get('pos') - ability.cost.pos);
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

    // Calculate damage modification based on fighting style passive effects
    private calculateModifiedDamage(damage: number, attacker: Entity, target: Entity): number {
        // Apply attacker's damage increase effects
        const damageIncrease = this.getPassiveEffectValue(attacker, PassiveEffectType.IncreaseDamageDealt);

        // Apply defender's damage reduction effects
        const damageReduction = this.getPassiveEffectValue(target, PassiveEffectType.ReduceDamageReceived);

        // Calculate final damage with both effects
        let modifiedDamage = damage + damageIncrease - damageReduction;

        // Ensure damage doesn't go below 1 if hit is successful
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

    // ## 

    public resolveAttack(action: AttackAction): NeoClashResult[] {
        const attacker = this.gameState.getEntity(action.by);
        const target = action.against !== undefined ? this.gameState.getEntity(action.against) : undefined;
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return [];
        }

        const abilityDices = action.ability.dices.map(d => d);

        let dice = abilityDices.pop();
        const globalResult: NeoClashResult[] = [];

        while (dice) {
            const result: NeoClashResult[] = this.resolveStrikeSequence([dice], attacker, target);
            result.forEach(r => globalResult.push(r));
            dice = abilityDices.pop();
        }

        return globalResult;
    }

    public applyAttack(clashes: NeoClashResult[], attacker: Entity, target: Entity) {
        for (const clash of clashes) {
            if (clash.result.fate === "Hit") {
                // Calculate base damage from weapon and ability
                const baseDamage = 5; // Placeholder - replace with actual damage calculation

                // Apply fighting style modifiers
                const finalDamage = this.calculateModifiedDamage(baseDamage, attacker, target);

                target.damage(finalDamage);

                // Add damage info to the clash result
                clash.result.damage = finalDamage;
            }
        }
    }

    private performRoll(
        dicePool: number[],
        targetValue: number,
        bonus: number,
        checkType: "DV" | "PV",
        attacker: Entity,
        target: Entity
    ): { rollResult: NeoClashResult; success: boolean; diceUsed: number | undefined } | undefined {
        let die = dicePool.pop();
        while (die !== undefined) {
            const roll = math.floor(uniformRandom(1, die + 1));

            // Apply fighting style passive effects
            let adjustedBonus = bonus;
            let adjustedTarget = targetValue;

            // Apply attacker's style effects - available if Entity has implemented fighting styles
            adjustedBonus += this.getPassiveEffectValue(attacker, checkType === "DV" ? PassiveEffectType.BoostOwnHit : PassiveEffectType.BoostOwnPenetration);

            // Apply defender's style effects - available if Entity has implemented fighting styles
            adjustedTarget += this.getPassiveEffectValue(target, checkType === "DV" ? PassiveEffectType.ReduceEnemyDV : PassiveEffectType.ReduceEnemyPV);

            const totalRoll = roll + adjustedBonus;
            const success = totalRoll >= adjustedTarget;

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
                    // Only add preliminary damage if we're generating a successful PV roll
                    damage: success && checkType === "PV" ? 5 : undefined // Placeholder, actual damage calculated in applyAttack
                }
            };

            if (success) {
                return { rollResult, success: true, diceUsed: die };
            } else {
                // Log the miss and continue to the next die
                // The actual NeoClashResult for the miss will be added to history by the caller if no success occurs
            }
            die = dicePool.pop();
        }
        return undefined; // No dice left or no successful roll
    }

    private resolveStrikeSequence(initialAbilityDices: number[], attacker: Entity, target: Entity): NeoClashResult[] {
        const rollHistory: NeoClashResult[] = [];
        // Create a copy to avoid mutating the original array if it's used elsewhere, and to allow .pop()
        const availableDice = [...initialAbilityDices];

        const dv = target.armour?.getDV() || 0;
        const bonusHit = attacker.weapon?.getTotalHitValue(attacker) || 0;

        const hitAttempt = this.performRoll([...availableDice], dv, bonusHit, "DV", attacker, target);

        if (!hitAttempt || !hitAttempt.success) {
            // Log all dice attempts as misses if no hit occurred
            initialAbilityDices.forEach(d => {
                // This part needs careful consideration on how to log misses if performRoll doesn't return individual miss results
                // For simplicity, we'll assume the last roll from performRoll (if any) is the one to log, or a generic miss.
                // A more robust solution might involve performRoll returning all attempts.
                // For now, if hitAttempt is undefined (no dice), or not successful, we log a generic miss for the sequence.
                // Or, we can construct a miss result based on the first die if available.
                if (initialAbilityDices[0]) {
                    rollHistory.push({
                        armour: target.armour.getState(),
                        weapon: attacker.weapon.getState(),
                        result: {
                            die: `d${initialAbilityDices[0]}`, // Example: log based on first die
                            against: "DV",
                            toSurmount: dv,
                            roll: 0, // Placeholder, actual roll for miss wasn't tracked this way
                            bonus: bonusHit,
                            fate: "Miss",
                        }
                    });
                }
            });
            return rollHistory;
        }

        rollHistory.push(hitAttempt.rollResult);

        const pv = target.armour?.getPV() || 0;
        const bonusPen = attacker.weapon?.getTotalPenetrationValue(attacker) || 0;

        // Use remaining dice for penetration check
        const penetrationAttempt = this.performRoll([...availableDice], pv, bonusPen, "PV", attacker, target);

        if (!penetrationAttempt || !penetrationAttempt.success) {
            // Similar to DV miss, log a generic penetration miss or based on available dice
            if (availableDice[0]) {
                rollHistory.push({
                    armour: target.armour.getState(),
                    weapon: attacker.weapon.getState(),
                    result: {
                        die: `d${availableDice[0]}`,
                        against: "PV",
                        toSurmount: pv,
                        roll: 0, // Placeholder
                        bonus: bonusPen,
                        fate: "Miss",
                    }
                });
            }
            return rollHistory;
        }

        rollHistory.push(penetrationAttempt.rollResult);
        return rollHistory;
    }
}

