import { GameState } from "shared/class/battle/State/GameState";
import { ActiveAbility } from "shared/class/battle/Systems/CombatSystem/Ability";
import { ActiveAbilityState } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { AttackAction, ClashResultFate, PlayerID } from "shared/class/battle/types";
import { uniformRandom } from "shared/utils";
import Logger from "shared/utils/Logger";
import Entity from "../../State/Entity";

interface HitResult {
    hitRoll: number;
    hitChance: number;
    critChance: number;
}

export default class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    constructor(
        private gameState: GameState,
    ) { }

    private tireAttacker(attacker: Entity, ability: ActiveAbilityState) {
        for (const [stat, modifier] of pairs(ability.cost)) {
            attacker.set(stat, attacker.get(stat) - modifier);
        }
    }

    private tireDefender(defender: Entity, ability: ActiveAbilityState) {
        defender.set('pos', defender.get('pos') - ability.cost.pos);
    }

    public applyClash(attackAction: AttackAction) {
        const clashResult = attackAction.clashResult;
        if (!clashResult) {
            this.logger.error("applyClash: Clash result not found");
            return;
        }
        this.logger.debug(`Applying clash result:`, clashResult);
        attackAction.executed = true;

        const attacker = this.gameState.getEntity(attackAction.by);
        assert(attacker, "Attacker not found");

        const target = attackAction.against ? this.gameState.getEntity(attackAction.against) : undefined;

        // 1. Attacker takes a swing, reducing his ability costs
        this.tireAttacker(attacker, attackAction.ability);

        // 2. Defender uses up energy to react
        if (target) this.tireDefender(target, attackAction.ability);

        // 3. Defender reacts to the attack, possibly modifying the forecasted clash result
        const { defendAttemptSuccessful, defendReactionUpdate } = clashResult
        if (target && defendAttemptSuccessful) {
            const { using: attackerUpdate, target: targetUpdate, clashResult: clashResultUpdate } = defendReactionUpdate;
            // if (attackerUpdate) this.syncOneEntity(attacker, attackerUpdate);
            // if (targetUpdate) this.syncOneEntity(target, targetUpdate);
            if (clashResultUpdate) {
                for (const [stat, value] of pairs(clashResultUpdate)) {
                    (clashResult as unknown as Record<string, unknown>)[stat] = value;
                }
            }
        }

        // 4. Apply the damage to the target
        if (target) {
            target.damage(clashResult.damage);
        }

        return clashResult;
    }

    private rebuildAbility(abilityState: ActiveAbilityState, by: PlayerID, against: PlayerID) {
        const allEntities = this.gameState.getEntityManager().getAllEntities();
        const ability = new ActiveAbility({
            ...abilityState,
            using: allEntities.find(e => e.playerID === by),
            target: allEntities.find(e => e.playerID === against),
        });
        return ability;
    }

    // ## 

    public resolveAttack(action: AttackAction) {
        this.logger.debug(`Calculating clash for attack: ${action.by} -> ${action.against}`);
        const attacker = this.gameState.getEntity(action.by);
        const target = action.against !== undefined ? this.gameState.getEntity(action.against) : undefined;
        if (!attacker || !target) {
            this.logger.error("Attacker or target not found", attacker, target);
            return { damage: 0, u_damage: 0, fate: "Miss", roll: 0, defendAttemptName: "", defendAttemptSuccessful: true, defendReactionUpdate: {} };
        }
        this.logger.debug(`Resolving attack from ${attacker.name || attacker.playerID} to ${target.name || target.playerID} using ability: ${action.ability.name || "unnamed"}`);

        const abilityDices = action.ability.dices.map(d => d);
        this.logger.debug(`Available ability dice: [${abilityDices.join(", ")}]`);

        let dice = abilityDices.pop();
        let result: ClashResultFate = 'Miss'; // Default to miss
        while (dice) {
            this.logger.debug(`🎲 Attempting attack roll with d${dice}`);
            result = this.resolveStrikeSequence([dice], attacker, target);
            this.logger.info(`⚔️ Attack outcome: ${result}`);
            if (result === 'Hit') {
                break;
            }
            dice = abilityDices.pop();
        }

        this.logger.debug(`🏁 Attack resolution complete: ${result} with remaining [${abilityDices.join(', ')}]`);
        // 3. Calculate the damage
        // 4. Apply the damage to the target
        // 5. Return the result
    }

    private resolveStrikeSequence(abilityDices: number[], attacker: Entity, target: Entity): ClashResultFate {
        this.logger.debug(`🎯 Initiating attack sequence with dice: [d${abilityDices.join(", d")}]`);

        // 1. Calculate if the attack hits
        let die = abilityDices.pop();
        let hits: boolean = false;
        const dv = target.armour?.getDV() || 0;
        const bonusHit = attacker.weapon?.getTotalHitValue(attacker) || 0;

        this.logger.debug(`🛡️ Target defense value (DV): ${dv}, Attacker accuracy bonus: ${bonusHit}`);

        while (die && hits === false) {
            if (!die) {
                this.logger.debug(`❌ No more dice available for hit check`);
                break;
            }

            const roll = uniformRandom(1, die);
            const totalRoll = roll + bonusHit;
            this.logger.debug(`🎯 Hit check: Rolled d${die}=${roll} + bonus ${bonusHit} = ${totalRoll} vs DV ${dv}`);

            if (totalRoll >= dv) {
                hits = true;
                this.logger.debug(`✅ Hit successful! Roll ${totalRoll} ≥ DV ${dv}`);
            } else {
                this.logger.debug(`❌🎯 Hit failed: Roll ${totalRoll} < DV ${dv}, trying next die`);
                die = abilityDices.pop();
            }
        }

        if (!hits) {
            this.logger.info(`💨 MISS: No successful hit roll against DV ${dv}`);
            return 'Miss';
        }

        // 2. Calculate if the attack penetrates
        const pv = target.armour?.getPV() || 0;
        const bonusPen = attacker.weapon?.getTotalPenetrationValue(attacker) || 0;
        hits = false;

        this.logger.debug(`🛡️ Checking armor penetration: Target PV: ${pv}, Attacker penetration bonus: ${bonusPen}`);

        while (die && hits === false) {
            if (!die) {
                this.logger.debug(`❌ No more dice available for penetration check`);
                break;
            }

            const roll = uniformRandom(1, die);
            const totalRoll = roll + bonusPen;
            this.logger.debug(`🗡️ Penetration check: Rolled d${die}=${roll} + bonus ${bonusPen} = ${totalRoll} vs PV ${pv}`);

            if (totalRoll >= pv) {
                hits = true;
                this.logger.debug(`✅ Penetration successful! Roll ${totalRoll} ≥ PV ${pv}`);
            } else {
                this.logger.debug(`❌🗡️ Penetration failed: Roll ${totalRoll} < PV ${pv}, trying next die`);
                die = abilityDices.pop();
            }
        }

        if (!hits) {
            this.logger.info(`🛡️ CLING: Attack blocked by armor (PV ${pv})`);
            return 'Cling';
        }

        this.logger.info(`💥 HIT: Attack penetrates armor and damages target`);
        return 'Hit';
    }
}

