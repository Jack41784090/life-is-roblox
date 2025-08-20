import { t } from "@rbxts/t";
import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { PassiveEffectType } from "shared/class/battle/Systems/CombatSystem/FightingStyle/type";
import { calculateRealityValue, uniformRandom } from "shared/utils";
import Logger from "shared/utils/Logger";
import { neoClashResultType } from "../../Network/SyncSystem/veri";
import State from "../../State";
import Entity from "../../State/Entity";
import { EntityState } from "../../State/Entity/types";
import { AttackAction, PlayerID } from "../../types";
import StatusEffectSystem from "../StatusEffectSystem";
import { EffectTriggerCondition } from "../StatusEffectSystem/types";
import { DamageType } from './Ability/types';
import { NeoClashResult, Reality, StrikeSequence, StrikeSequenceResult, StrikeSequenceRoll, TriggerModify } from "./types";



export default class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    private gameState: State;
    private statusEffectSystem: StatusEffectSystem;

    constructor(gameState: State) {
        this.gameState = gameState;
        this.statusEffectSystem = gameState.getStatusEffectSystem();
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
     * 
     * NOTE: OnMove triggers would be called by movement system when entities change position.
     * OnApply, OnRemove, OnTurnStart, OnTurnEnd triggers are handled by other systems.
     */

    private collectTriggerEffectsFromEvent(
        eventName: EffectTriggerCondition,
        attacker: EntityState,
        defender: EntityState,
        activeAbilityTriggerMap?: Record<string, (context: { attacker: EntityState, defender: EntityState }) => TriggerModify[]>,
        simulationContext?: Record<string, unknown>
    ): TriggerModify[] {
        const abilityTriggerMods = activeAbilityTriggerMap ?
            activeAbilityTriggerMap[eventName]?.({ attacker, defender }) :
            [];

        const _a_sem = this.statusEffectSystem.getEntityManager(attacker.playerID);
        const _d_sem = this.statusEffectSystem.getEntityManager(defender.playerID);
        if (!_a_sem || !_d_sem) {
            this.logger.error("Unexpected attacker or defender unrecognised by statusEffectSystem when collecting trigger effects in " + eventName);
            return abilityTriggerMods;
        }

        const attackerTriggers = _a_sem.simulateTriggerEffect(
            eventName,
            { attacker, defender, ...simulationContext }
        );
        const defenderTriggers = _d_sem.simulateTriggerEffect(
            eventName,
            { attacker, defender, ...simulationContext }
        );

        const allEffects: TriggerModify[] = [];
        abilityTriggerMods.forEach(_ => allEffects.push(_));
        attackerTriggers.forEach(_ => allEffects.push(_));
        defenderTriggers.forEach(_ => allEffects.push(_));
        return allEffects;
    }

    public resolveAttack(action: AttackAction): (StrikeSequence | TriggerModify)[] {
        const [attacker, target] = this.gameState.getAttackerAndDefender(action);
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return [];
        }

        const _vattacker = attacker.state();
        const _vtarget = target.state();
        const attackersAbilityState = action.ability;

        // Initialize result array to hold both StrikeSequences and TriggerModify objects
        const triggerModifies: TriggerModify[] = [];
        const strikeSequences: StrikeSequence[] = [];
        const results: (StrikeSequence | TriggerModify)[] = [];

        // initialise the dices
        const abilityDices = action.ability.dices.map(d => d);
        let dice = abilityDices.pop();

        // EVENT: ON_USE_ABILITY
        this.collectTriggerEffectsFromEvent(EffectTriggerCondition.OnUseAbility,
            _vattacker, _vtarget, attackersAbilityState.triggerMap).forEach(modify => {
                triggerModifies.push(modify);
                results.push(modify);
                if (modify.targeting === 'attacker') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vattacker);
                }
                else if (modify.targeting === 'defender') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vtarget);
                }
            });

        // clear out the clash event subscriptions and resubscribe for the new combatants
        // EVENT: BEFORE_ATTACK
        this.collectTriggerEffectsFromEvent(EffectTriggerCondition.BeforeAttack,
            _vattacker, _vtarget, attackersAbilityState.triggerMap).forEach(modify => {
                triggerModifies.push(modify);
                results.push(modify);
                if (modify.targeting === 'attacker') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vattacker);
                }
                else if (modify.targeting === 'defender') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vtarget);
                }
            });

        // Loop through all dices and resolve the strike sequence
        while (dice) {
            this.collectTriggerEffectsFromEvent(EffectTriggerCondition.BeforeStrikeSequence,
                _vattacker, _vtarget, attackersAbilityState.triggerMap).forEach(modify => {
                    triggerModifies.push(modify);
                    results.push(modify);
                    if (modify.targeting === 'attacker') {
                        this.statusEffectSystem.applyImmediateStatChange(modify, _vattacker);
                    }
                    else if (modify.targeting === 'defender') {
                        this.statusEffectSystem.applyImmediateStatChange(modify, _vtarget);
                    }
                });

            const result: StrikeSequence = this.resolveStrikeSequence([dice], _vattacker, _vtarget);
            strikeSequences.push(result);
            results.push(result);
            dice = abilityDices.pop();

            this.collectTriggerEffectsFromEvent(EffectTriggerCondition.AfterStrikeSequence,
                _vattacker, _vtarget, attackersAbilityState.triggerMap).forEach(modify => {
                    triggerModifies.push(modify);
                    results.push(modify);
                    if (modify.targeting === 'attacker') {
                        this.statusEffectSystem.applyImmediateStatChange(modify, _vattacker);
                    }
                    else if (modify.targeting === 'defender') {
                        this.statusEffectSystem.applyImmediateStatChange(modify, _vtarget);
                    }
                });
        }

        // EVENT: AFTER_ATTACK
        this.collectTriggerEffectsFromEvent(EffectTriggerCondition.AfterAttack,
            _vattacker, _vtarget, attackersAbilityState.triggerMap).forEach(modify => {
                triggerModifies.push(modify);
                results.push(modify);
                if (modify.targeting === 'attacker') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vattacker);
                }
                else if (modify.targeting === 'defender') {
                    this.statusEffectSystem.applyImmediateStatChange(modify, _vtarget);
                }
            });

        // Generate TriggerModify objects based on combat results (crits, hits, etc.)
        const combatResultTriggers = this.generateTriggerModifiesFromCombatResults(strikeSequences, _vattacker, _vtarget);
        combatResultTriggers.forEach(modify => triggerModifies.push(modify));

        const attackingAbility = this.rebuildAbility(attackersAbilityState, action.by, action.against!);
        const processedStrikeSequences = strikeSequences.map(ss => {
            return ss.map(clash => {
                // Type guard: only process NeoClashResult objects, skip TriggerModify objects
                if ('result' in clash) {
                    const damage = this.calculateDamage(attackingAbility);
                    clash.result.damage = this.calculateModifiedDamage(damage, _vattacker, _vtarget);
                    // clash.clashKills = this.isAttackKills(target.playerID, clash);
                }
                return clash;
            });
        });

        processedStrikeSequences.forEach(sequence => results.push(sequence));
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
    private resolveStrikeSequence(initialAbilityDices: number[], attacker: EntityState, target: EntityState): (NeoClashResult | TriggerModify)[] {
        const rollHistory: StrikeSequence = [];
        const availableDice = [...initialAbilityDices];

        // EVENT: BEFORE_DV_CHECK
        this.collectTriggerEffectsFromEvent(
            EffectTriggerCondition.BeforeDVCheck,
            attacker,
            target,
        ).forEach(trigger => rollHistory.push(trigger));

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

        // Process each DV roll result and trigger appropriate events
        sequenceToHitResult.sequence.forEach(sequenceRoll => {
            rollHistory.push(sequenceRoll.rollResult);
            const { fate } = sequenceRoll.rollResult.result;

            // EVENT: ON_HIT for DV check
            if (fate === "Hit" || fate === "CRIT") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnHit,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }

            // EVENT: ON_MISS for DV check
            if (fate === "Miss") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnMiss,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }

            // EVENT: ON_CRIT for DV check
            if (fate === "CRIT") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnCrit,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }
        });

        // EVENT: AFTER_DV_CHECK
        this.collectTriggerEffectsFromEvent(
            EffectTriggerCondition.AfterDVCheck,
            attacker,
            target,
        ).forEach(trigger => rollHistory.push(trigger));

        // all dices failed to hit
        if (!sequenceToHitResult.success) {
            return rollHistory;
        }

        // EVENT: BEFORE_PV_CHECK
        this.collectTriggerEffectsFromEvent(
            EffectTriggerCondition.BeforePVCheck,
            attacker,
            target,
        ).forEach(trigger => rollHistory.push(trigger));

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

        // Process each PV roll result and trigger appropriate events
        sequenceToPenetrateResult.sequence.forEach(sequenceRoll => {
            rollHistory.push(sequenceRoll.rollResult);
            const { fate } = sequenceRoll.rollResult.result;

            // EVENT: ON_HIT for PV check
            if (fate === "Hit" || fate === "CRIT") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnHit,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }

            // EVENT: ON_MISS for PV check
            if (fate === "Miss") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnMiss,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }

            // EVENT: ON_CRIT for PV check
            if (fate === "CRIT") {
                this.collectTriggerEffectsFromEvent(
                    EffectTriggerCondition.OnCrit,
                    attacker,
                    target,
                ).forEach(trigger => rollHistory.push(trigger));
            }
        });

        // EVENT: AFTER_PV_CHECK
        this.collectTriggerEffectsFromEvent(
            EffectTriggerCondition.AfterPVCheck,
            attacker,
            target,
        ).forEach(trigger => rollHistory.push(trigger));

        // NOTE: OnBlock and OnDodge triggers would be implemented here
        // when defensive action mechanics are added to the combat system
        // Example:
        // if (fate === "Block") {
        //     this.collectTriggerEffectsFromEvent(EffectTriggerCondition.OnBlock, attacker, target)
        //         .forEach(trigger => rollHistory.push(trigger));
        // }
        // if (fate === "Dodge") {
        //     this.collectTriggerEffectsFromEvent(EffectTriggerCondition.OnDodge, attacker, target)
        //         .forEach(trigger => rollHistory.push(trigger));
        // }

        return rollHistory;
    }

    private performRoll(
        dicePool: number[],
        _toOvercome: number,
        _bonus: number,
        checkType: "DV" | "PV",
        attacker: EntityState,
        target: EntityState
    ): StrikeSequenceResult {

        let die = dicePool.pop();
        const results: StrikeSequenceRoll[] = [];
        let overallSuccess = false;

        while (die !== undefined) {
            const roll = math.floor(uniformRandom(1, die + 1));

            let bonus = _bonus;
            bonus += this.getPassiveEffectValue(attacker, checkType === "DV" ? PassiveEffectType.AdjustHit : PassiveEffectType.AdjustPen);
            bonus += this.getPassiveEffectValue(target, checkType === "DV" ? PassiveEffectType.AdjustEnemyHit : PassiveEffectType.AdjustEnemyPen);

            let toOvercome = _toOvercome;
            toOvercome += this.getPassiveEffectValue(attacker, checkType === "DV" ? PassiveEffectType.AdjustEnemyDV : PassiveEffectType.AdjustEnemyPV);
            toOvercome += this.getPassiveEffectValue(target, checkType === "DV" ? PassiveEffectType.AdjustDV : PassiveEffectType.AdjustPV);

            const totalRoll = roll + bonus;
            const success = totalRoll >= toOvercome;
            overallSuccess = overallSuccess || success;

            const isCrit = roll === die;
            const fate = isCrit ? "CRIT" : (success ? "Hit" : "Miss");

            const rollResult: NeoClashResult = {
                armour: target.armour,
                weapon: attacker.weapon,
                // ability: attacker.weapon.getAbility(), // Assuming you might want to add ability context here
                result: {
                    die: `d${die}`,
                    against: checkType,
                    toSurmount: toOvercome,
                    roll: roll,
                    bonus: bonus,
                    fate: fate,
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

    public applyAttack(strikeSequencesOrImmStatusEffect: (StrikeSequence | TriggerModify)[], ability: ActiveAbility) {
        const [attacker, defender] = this.gameState.getAttackerAndDefender(ability);
        if (!attacker || !defender) {
            this.logger.error("Attacker or defender not found", attacker, defender);
            return;
        }

        for (const item of strikeSequencesOrImmStatusEffect) {
            if (t.array(neoClashResultType)(item)) {
                // Handle regular strike sequence
                for (const clash of item) {
                    const { against, fate } = clash.result;
                    if (against === "PV" && (fate === "Hit" || fate === "CRIT")) {
                        const damageAmount = clash.result.damage || 0;

                        // EVENT: ON_DEAL_DAMAGE (for attacker)
                        this.collectTriggerEffectsFromEvent(
                            EffectTriggerCondition.OnDealDamage,
                            attacker.state(),
                            defender.state(),
                            undefined,
                            { damageAmount }
                        ).forEach(modify => {
                            if (modify.targeting === 'attacker') {
                                this.statusEffectSystem.applyImmediateStatChange(modify, attacker.state());
                            } else if (modify.targeting === 'defender') {
                                this.statusEffectSystem.applyImmediateStatChange(modify, defender.state());
                            }
                        });

                        // EVENT: ON_TAKE_DAMAGE (for defender)
                        this.collectTriggerEffectsFromEvent(
                            EffectTriggerCondition.OnTakeDamage,
                            attacker.state(),
                            defender.state(),
                            undefined,
                            { damageAmount }
                        ).forEach(modify => {
                            if (modify.targeting === 'attacker') {
                                this.statusEffectSystem.applyImmediateStatChange(modify, attacker.state());
                            } else if (modify.targeting === 'defender') {
                                this.statusEffectSystem.applyImmediateStatChange(modify, defender.state());
                            }
                        });

                        defender.damage(damageAmount);
                    }
                }
            }
            else {
                // Handle TriggerModify object through the integration service
                const triggerModify = item as TriggerModify;
                this.statusEffectSystem.applyImmediateStatChange(triggerModify, triggerModify.targeting === 'attacker' ? attacker : defender);
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

    private generateTriggerModifiesFromCombatResults(
        strikeSequences: StrikeSequence[],
        attackerState: EntityState,
        targetState: EntityState
    ): TriggerModify[] {
        const triggerModifies: TriggerModify[] = [];

        // Analyze combat results and generate appropriate TriggerModify objects
        for (const sequence of strikeSequences) {
            for (const clash of sequence) {
                // Type guard: only process NeoClashResult objects, skip TriggerModify objects
                if ('result' in clash) {
                    const { fate, against } = clash.result;

                    // Critical hit bonuses - boost attacker's strength
                    if (fate === "CRIT") {
                        triggerModifies.push({
                            targeting: 'attacker',
                            mod: 'str',
                            value: 3
                        });

                        // Target might get stunned effect - reduce posture
                        triggerModifies.push({
                            targeting: 'defender',
                            mod: 'pos',
                            value: -10
                        });
                    }

                    // Successful penetration effects - restore mana
                    if (against === "PV" && (fate === "Hit" || fate === "CRIT")) {
                        triggerModifies.push({
                            targeting: 'attacker',
                            mod: 'mana',
                            value: 2
                        });
                    }

                    // Miss penalties - reduce posture
                    if (fate === "Miss") {
                        triggerModifies.push({
                            targeting: 'attacker',
                            mod: 'pos',
                            value: -3
                        });
                    }
                }
            }
        }

        return triggerModifies;
    }
}

