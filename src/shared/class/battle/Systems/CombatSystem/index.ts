import { t } from "@rbxts/t";
import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { PassiveEffectType } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import { calculateRealityValue, uniformRandom } from "shared/utils";
import Logger from "shared/utils/Logger";
import { neoClashResultType } from "../../Network/SyncSystem/veri";
import State from "../../State";
import Entity from "../../State/Entity";
import { EntityStance, EntityState } from "../../State/Entity/types";
import { AttackAction, PlayerID } from "../../types";
import TriggerModifyIntegrationService from "../Integration/TriggerModifyIntegrationService";
import { DamageType } from './Ability/types';
import { NeoClashResult, Reality, StrikeSequence, StrikeSequenceResult, StrikeSequenceRoll, TriggerModify } from "./types";

export default class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    private gameState: State;
    private triggerModifyService: TriggerModifyIntegrationService; constructor(gameState: State) {
        this.gameState = gameState;
        this.triggerModifyService = new TriggerModifyIntegrationService(gameState, gameState.getStatusEffectSystem());
    }

    /**
     * Resolves an attack action and returns an array of strike sequences.
     * 
     * This method handles the combat resolution process by:
     * 1. Retrieving the attacker and defender from the game state
     * 2. Processing each ability dice to generate strike sequences; doesn't update the clash damage
     * 3. Calculating and updating damage for each clash in the sequences
     * 
     * @param action - The attack action to resolve containing ability details and target information
     * @returns An array of strike sequences, each containing clash results with calculated damage
     * @remarks
     * Strike sequences represent the outcome of dice-based combat encounters.
     * Damage calculation considers both the base ability damage and potential modifiers from attacker and defender.
     */    public resolveAttack(action: AttackAction): (StrikeSequence | TriggerModify)[] {
        const [attacker, target] = this.gameState.getAttackerAndDefender(action);
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return [];
        }

        const attackerState = attacker.state();
        const targetState = target.state();
        const abilityState = action.ability;

        // Initialize result array to hold both StrikeSequences and TriggerModify objects
        const results: (StrikeSequence | TriggerModify)[] = [];
        const triggerModifies: TriggerModify[] = [];

        // initialise the dices
        const abilityDices = action.ability.dices.map(d => d);
        let dice = abilityDices.pop();
        const strikeSequences: StrikeSequence[] = [];

        // clear out the clash event subscriptions and resubscribe for the new combatants

        // EVENT: BEFORE_ATTACK
        abilityState.triggerMap?.beforeAttack?.({
            attacker: attackerState,
            defender: targetState,
        })

        // Generate TriggerModify objects from ability triggers before attack
        const beforeAttackTriggers = this.generateTriggerModifiesFromAbility(abilityState, 'beforeAttack', attackerState, targetState);
        beforeAttackTriggers.forEach(modify => triggerModifies.push(modify));

        // Loop through all dices and resolve the strike sequence
        while (dice) {
            // EVENT: BEFORE_SS
            abilityState.triggerMap?.beforeStrikeSequence?.({
                attacker: attackerState,
                defender: targetState,
                // dice: dice,
            })

            const result: StrikeSequence = this.resolveStrikeSequence([dice], attackerState, targetState);
            strikeSequences.push(result);
            dice = abilityDices.pop();

            // EVENT: AFTER_SS
            abilityState.triggerMap?.afterStrikeSequence?.({
                attacker: attackerState,
                defender: targetState,
                // sequence: result,
            });
        }

        // EVENT: AFTER_ATTACK
        abilityState.triggerMap?.afterAttack?.({
            attacker: attackerState,
            defender: targetState,
        })

        // Generate TriggerModify objects from ability triggers after attack
        const afterAttackTriggers = this.generateTriggerModifiesFromAbility(abilityState, 'afterAttack', attackerState, targetState);
        afterAttackTriggers.forEach(modify => triggerModifies.push(modify));

        // Generate TriggerModify objects based on combat results (crits, hits, etc.)
        const combatResultTriggers = this.generateTriggerModifiesFromCombatResults(strikeSequences, attackerState, targetState);
        combatResultTriggers.forEach(modify => triggerModifies.push(modify));

        const attackingAbility = this.rebuildAbility(action.ability, action.by, action.against!);
        const processedStrikeSequences = strikeSequences.map(ss => {
            return ss.map(clash => {
                const damage = this.calculateDamage(attackingAbility);
                clash.result.damage = this.calculateModifiedDamage(damage, attackerState, targetState);
                // clash.clashKills = this.isAttackKills(target.playerID, clash);
                return clash;
            });
        });

        // Add all processed strike sequences to results
        processedStrikeSequences.forEach(sequence => results.push(sequence));

        // Add all generated TriggerModify objects to results
        triggerModifies.forEach(modify => results.push(modify));

        return results;
    }
    /**
     * Resolves a strike sequence between an attacker and a target using the provided ability dice.
     * 
     * The function performs two sequential checks:
     * 1. A Defense Value (DV) check to determine if the attack hits
     * 2. If successful, a Penetration Value (PV) check to determine if the attack penetrates armor
     * 
     * @param initialAbilityDices - Array of dice values representing the attacker's ability
     * @param attacker - The attacking Entity
     * @param target - The target Entity being attacked
     * @returns A StrikeSequence array containing the results of all dice rolls during the sequence
     * 
     * @remarks
     * - If the DV check fails (attacker misses), the function returns early with only the DV roll results
     * - Both checks utilize the target's armor properties and the attacker's weapon properties
     * - The remaining dice after the DV check are used for the PV check
     */
    private resolveStrikeSequence(initialAbilityDices: number[], attacker: EntityState, target: EntityState): StrikeSequence {
        const rollHistory: StrikeSequence = [];
        const availableDice = [...initialAbilityDices];

        // EVENT: BEFORE_DV_CHECK

        // Perform DV check first
        const getTotalHitValue = (attacker: EntityState): number => {
            const man = calculateRealityValue(Reality.Maneuver, attacker.stats);
            const pre = calculateRealityValue(Reality.Precision, attacker.stats);
            const result = attacker.weapon.hitBonus + man / 2 + pre / 2;
            return result;
        }
        const dv = target.armour.DV || 0;
        const bonusHit = getTotalHitValue(attacker) || 0;
        const sequenceToHitResult = this.performRoll([...availableDice], dv, bonusHit, "DV", attacker, target);
        sequenceToHitResult.sequence.forEach(sequenceRoll => rollHistory.push(sequenceRoll.rollResult))

        // EVENT: AFTER_DV_CHECK

        // all dices failed to hit
        if (!sequenceToHitResult.success) {
            return rollHistory;
        }

        // EVENT: BEFORE_PV_CHECK

        // Use remaining dice for penetration check
        const getTotalPenetrationValue = (attacker: EntityState): number => {
            const force = calculateRealityValue(Reality.Force, attacker.stats);
            const pre = calculateRealityValue(Reality.Precision, attacker.stats);
            const result = attacker.weapon.penetrationBonus + force * 0.67 + pre * 0.33;
            return result;
        }
        const pv = target.armour.PV || 0;
        const bonusPen = getTotalPenetrationValue(attacker) || 0;
        const sequenceToPenetrateResult = this.performRoll([...availableDice], pv, bonusPen, "PV", attacker, target);
        sequenceToPenetrateResult.sequence.forEach(sequenceRoll => rollHistory.push(sequenceRoll.rollResult));

        // EVENT: AFTER_PV_CHECK

        return rollHistory;
    }

    private performRoll(
        dicePool: number[],
        targetValue: number,
        bonus: number,
        checkType: "DV" | "PV",
        attacker: EntityState,
        target: EntityState
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
                armour: target.armour,
                weapon: attacker.weapon,
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

    private tireAttacker(attacker: Entity, ability: ActiveAbilityState) {
        for (const [stat, modifier] of pairs(ability.cost)) {
            attacker.set(stat, attacker.get(stat) - modifier);
        }
    }

    private tireDefender(defender: Entity, ability: ActiveAbilityState) {
        // defender.set('pos', defender.get('pos') - ability.cost.pos);
    }

    private getPassiveEffectValue(entity: EntityState, effectType: PassiveEffectType): number {
        try {
            const style = entity.fightingStyles[entity.activeStyleIndex];
            return style.passiveEffects.find(effect => effect.type === effectType)?.value || 0;
        } catch (err) {
            this.logger.warn(`Error getting passive effect ${effectType} from entity ${entity.name}:`, err as defined);
        }
        return 0;
    }

    private calculateModifiedDamage(damage: number, attacker: EntityState, target: EntityState): number {
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

    public applyAttack(strikeSequences: (StrikeSequence | TriggerModify)[], ability: ActiveAbility) {
        const [attacker, defender] = this.gameState.getAttackerAndDefender(ability);
        if (!attacker || !defender) {
            this.logger.error("Attacker or defender not found", attacker, defender);
            return;
        }

        for (const sequence of strikeSequences) {
            if (t.array(neoClashResultType)(sequence)) {
                // Handle regular strike sequence
                for (const clash of sequence) {
                    const { against, fate } = clash.result;
                    if (against === "PV" && fate === "Hit") {
                        defender.damage(clash.result.damage || 0);
                    }
                }
            } else {
                // Handle TriggerModify object through the integration service
                const triggerModify = sequence as TriggerModify;
                this.triggerModifyService.applyTriggerModify(triggerModify, defender.playerID, attacker.playerID);
            }
        }

        this.tireAttacker(attacker, ability.getState());
        this.tireDefender(defender, ability.getState());
    }

    private calculateDamage(ability: ActiveAbility): number {
        const [attacker, defender] = this.gameState.getAttackerAndDefender(ability)
        if (!attacker || !defender) {
            this.logger.error("Attacker or defender not found", attacker, defender);
            return 0;
        }
        const attackerState = attacker.state();
        const defenderState = defender.state();

        const getRawDamageTaken = (damageTypesArray: Record<string, number>): number => {
            let damage = 0;
            for (const [damageType, value] of pairs(damageTypesArray)) {
                const res = defenderState.armour.resistance.get(damageType as DamageType);
                damage += res ?
                    value * (1 - res) :
                    value;
            }
            return damage;
        }
        return this.calculateModifiedDamage(getRawDamageTaken(ability.getTotalDamageArray()), attackerState, defenderState);
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
    } private generateTriggerModifiesFromAbility(
        abilityState: ActiveAbilityState,
        triggerType: 'beforeAttack' | 'afterAttack' | 'beforeStrikeSequence' | 'afterStrikeSequence',
        attackerState: EntityState,
        targetState: EntityState
    ): TriggerModify[] {
        const triggerModifies: TriggerModify[] = [];

        // Generate TriggerModify objects based on ability characteristics
        // This can be expanded to read from ability configurations or special trigger rules

        if (triggerType === 'beforeAttack') {
            // Example: Some abilities might boost attacker stats before attacking
            if (abilityState.name === 'Power Slash') {
                triggerModifies.push({
                    mod: 'str',
                    value: 2
                });
            }
        }

        if (triggerType === 'afterAttack') {
            // Example: Some abilities might have lingering effects after attacking
            if (abilityState.direction === EntityStance.High) {
                triggerModifies.push({
                    mod: 'pos',
                    value: -5
                });
            }
        }

        return triggerModifies;
    } private generateTriggerModifiesFromCombatResults(
        strikeSequences: StrikeSequence[],
        attackerState: EntityState,
        targetState: EntityState
    ): TriggerModify[] {
        const triggerModifies: TriggerModify[] = [];

        // Analyze combat results and generate appropriate TriggerModify objects
        for (const sequence of strikeSequences) {
            for (const clash of sequence) {
                const { fate, against } = clash.result;

                // Critical hit bonuses - boost attacker's strength
                if (fate === "CRIT") {
                    triggerModifies.push({
                        mod: 'str',
                        value: 3
                    });

                    // Target might get stunned effect - reduce posture
                    triggerModifies.push({
                        mod: 'pos',
                        value: -10
                    });
                }

                // Successful penetration effects - restore mana
                if (against === "PV" && fate === "Hit") {
                    triggerModifies.push({
                        mod: 'mana',
                        value: 2
                    });
                }

                // Miss penalties - reduce posture
                if (fate === "Miss") {
                    triggerModifies.push({
                        mod: 'pos',
                        value: -3
                    });
                }
            }
        }

        return triggerModifies;
    }
}

