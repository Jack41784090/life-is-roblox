import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
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

    // public applyClash(attackAction: AttackAction) {
    //     const clashResult = attackAction.clashResult;
    //     if (!clashResult) {
    //         this.logger.error("applyClash: Clash result not found");
    //         return;
    //     }
    //     this.logger.debug(`Applying clash result:`, clashResult);
    //     attackAction.executed = true;

    //     const attacker = this.gameState.getEntity(attackAction.by);
    //     assert(attacker, "Attacker not found");

    //     const target = attackAction.against ? this.gameState.getEntity(attackAction.against) : undefined;

    //     // 1. Attacker takes a swing, reducing his ability costs
    //     this.tireAttacker(attacker, attackAction.ability);

    //     // 2. Defender uses up energy to react
    //     if (target) this.tireDefender(target, attackAction.ability);

    //     // 3. Defender reacts to the attack, possibly modifying the forecasted clash result
    //     const { defendAttemptSuccessful, defendReactionUpdate } = clashResult
    //     if (target && defendAttemptSuccessful) {
    //         const { using: attackerUpdate, target: targetUpdate, clashResult: clashResultUpdate } = defendReactionUpdate;
    //         // if (attackerUpdate) this.syncOneEntity(attacker, attackerUpdate);
    //         // if (targetUpdate) this.syncOneEntity(target, targetUpdate);
    //         if (clashResultUpdate) {
    //             for (const [stat, value] of pairs(clashResultUpdate)) {
    //                 (clashResult as unknown as Record<string, unknown>)[stat] = value;
    //             }
    //         }
    //     }

    //     // 4. Apply the damage to the target
    //     if (target) {
    //         target.damage(clashResult.damage);
    //     }

    //     return clashResult;
    // }

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
        this.logger.debug(`Calculating clash for attack: ${action.by} -> ${action.against}`);
        const attacker = this.gameState.getEntity(action.by);
        const target = action.against !== undefined ? this.gameState.getEntity(action.against) : undefined;
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return [];
        }
        this.logger.debug(`Resolving attack from ${attacker.name || attacker.playerID} to ${target.name || target.playerID} using ability: ${action.ability.name || "unnamed"}`);

        const abilityDices = action.ability.dices.map(d => d);
        this.logger.debug(`Available ability dice: [${abilityDices.join(", ")}]`);

        let dice = abilityDices.pop();
        const globalResult: NeoClashResult[] = [];

        while (dice) {
            this.logger.debug(`🎲 Attempting attack roll with d${dice}`);
            const result: NeoClashResult[] = this.resolveStrikeSequence([dice], attacker, target);
            result.forEach(r => globalResult.push(r));
            this.logger.info(`⚔️ Attack outcome: ${result}`);
            dice = abilityDices.pop();
        }

        this.logger.debug(`🏁 Attack resolution complete:`, globalResult);
        return globalResult;
    }

    public applyAttack(clashes: NeoClashResult[], attacker: Entity, target: Entity) {
        this.logger.debug(`Applying attack results to entities`);
        for (const clash of clashes) {
            if (clash.result.fate === "Hit") {
                // const takingDamage = target.armour.getRawDamageTaken(attacker, damageTypes);
                // this.logger.debug(`Applying damage ${takingDamage} to target ${target.name}`);
                // target.damage(takingDamage);
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
            const totalRoll = roll + bonus;
            const success = totalRoll >= targetValue;

            this.logger.debug(`🎲 ${checkType} check: Rolled d${die}=${roll} + bonus ${bonus} = ${totalRoll} vs ${checkType} ${targetValue}`);

            const rollResult: NeoClashResult = {
                target: target.armour.getState(),
                weapon: attacker.weapon.getState(),
                // ability: attacker.weapon.getAbility(), // Assuming you might want to add ability context here
                result: {
                    die: `d${die}`,
                    against: checkType,
                    toSurmount: targetValue,
                    roll: roll,
                    bonus: bonus,
                    fate: success ? "Hit" : "Miss",
                    // damage: []
                }
            };

            if (success) {
                this.logger.debug(`✅ ${checkType} ${success ? "successful" : "failed"}! Roll ${totalRoll} ${success ? "≥" : "<"} ${checkType} ${targetValue}`);
                return { rollResult, success: true, diceUsed: die };
            } else {
                this.logger.debug(`❌ ${checkType} failed: Roll ${totalRoll} < ${checkType} ${targetValue}, trying next die`);
                // Log the miss and continue to the next die
                // The actual NeoClashResult for the miss will be added to history by the caller if no success occurs
            }
            die = dicePool.pop();
        }
        return undefined; // No dice left or no successful roll
    }

    private resolveStrikeSequence(initialAbilityDices: number[], attacker: Entity, target: Entity): NeoClashResult[] {
        this.logger.debug(`🎯 Initiating strike sequence with dice: [d${initialAbilityDices.join(", d")}]`);
        const rollHistory: NeoClashResult[] = [];
        // Create a copy to avoid mutating the original array if it's used elsewhere, and to allow .pop()
        const availableDice = [...initialAbilityDices];

        const dv = target.armour?.getDV() || 0;
        const bonusHit = attacker.weapon?.getTotalHitValue(attacker) || 0;
        this.logger.debug(`🛡️ Target defense value (DV): ${dv}, Attacker accuracy bonus: ${bonusHit}`);

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
                        target: target.armour.getState(),
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
            this.logger.info(`💨 MISS: No successful hit roll against DV ${dv}`);
            return rollHistory;
        }

        rollHistory.push(hitAttempt.rollResult);
        if (hitAttempt.diceUsed !== undefined) {
            // Remove the used die and any dice "smaller" (rolled before it) from the available pool
            const usedDieIndex = availableDice.indexOf(hitAttempt.diceUsed);
            if (usedDieIndex > -1) {
                availableDice.remove(usedDieIndex); // .pop() works from the end, so this effectively removes it and prior
            }
        }


        const pv = target.armour?.getPV() || 0;
        const bonusPen = attacker.weapon?.getTotalPenetrationValue(attacker) || 0;
        this.logger.debug(`🛡️ Checking armor penetration: Target PV: ${pv}, Attacker penetration bonus: ${bonusPen}`);

        // Use remaining dice for penetration check
        const penetrationAttempt = this.performRoll([...availableDice], pv, bonusPen, "PV", attacker, target);

        if (!penetrationAttempt || !penetrationAttempt.success) {
            // Similar to DV miss, log a generic penetration miss or based on available dice
            if (availableDice[0]) {
                rollHistory.push({
                    target: target.armour.getState(),
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
            this.logger.info(`🛡️ CLING: Attack blocked by armor (PV ${pv})`);
            return rollHistory;
        }

        rollHistory.push(penetrationAttempt.rollResult);
        this.logger.info(`💥 HIT: Attack penetrates armor and damages target`);
        return rollHistory;
    }
}

