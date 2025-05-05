import { Entity } from "@rbxts/matter";
import { AttackAction, ClashResult, ClashResultFate, PlayerID, Reality } from "shared/types/battle-types";
import { calculateRealityValue } from "shared/utils";
import Logger from "shared/utils/Logger";
import { EventBus } from "../../Events/EventBus";
import { EntityState } from "../../State/Entity/types";
import { GameState } from "../../State/GameState";
import { ActiveAbility } from "./Ability";
import { AbilityState, ActiveAbilityState } from "./Ability/types";

interface HitResult {
    hitRoll: number;
    hitChance: number;
    critChance: number;
}

export class CombatSystem {
    private logger = Logger.createContextLogger("CombatSystem");
    constructor(
        private gameState: GameState,
        private eventBus: EventBus
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

        const attacker = this.getEntity(attackAction.by);
        assert(attacker, "Attacker not found");

        const target = attackAction.against ? this.getEntity(attackAction.against) : undefined;

        // 1. Attacker takes a swing, reducing his ability costs
        this.tireAttacker(attacker, attackAction.ability);

        // 2. Defender uses up energy to react
        if (target) this.tireDefender(target, attackAction.ability);

        // 3. Defender reacts to the attack, possibly modifying the forecasted clash result
        const { defendAttemptSuccessful, defendReactionUpdate } = clashResult
        if (target && defendAttemptSuccessful) {
            const { using: attackerUpdate, target: targetUpdate, clashResult: clashResultUpdate } = defendReactionUpdate;
            if (attackerUpdate) this.syncOneEntity(attacker, attackerUpdate);
            if (targetUpdate) this.syncOneEntity(target, targetUpdate);
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
        const allEntities = this.getAllEntities();
        const ability = new ActiveAbility({
            ...abilityState,
            using: allEntities.find(e => e.playerID === by),
            target: allEntities.find(e => e.playerID === against),
        });
        return ability;
    }

    // ## 

    public resolveAttack(action: AttackAction): ClashResult {
        this.logger.debug(`Calculating clash for attack: ${action.by} -> ${action.against}`);
        const { using: attacker, target, chance: acc } = action.ability;

        if (!attacker || !target) {
            this.logger.error("Attacker or target not found");
            return { damage: 0, u_damage: 0, fate: "Miss", roll: 0, defendAttemptName: "", defendAttemptSuccessful: true, defendReactionUpdate: {} };
        }
        this.logger.info(`Clash: ${attacker.name} vs ${target.name} (acc: ${acc})`);

        const { hitRoll, hitChance, critChance } = this.rollHit(acc, attacker, target);

        const ability = this.rebuildAbility(action.ability, attacker.playerID, target.playerID);
        const abilityDamage = ability.calculateDamage();
        const minDamage = abilityDamage * 0.5;
        const maxDamage = abilityDamage;

        let fate: ClashResultFate = "Miss";
        let damage = 0;
        if (hitRoll <= hitChance) {
            if (hitRoll <= hitChance * 0.1 + critChance) {
                damage = math.random((minDamage + maxDamage) / 2, maxDamage) * 2;
                fate = "CRIT";
            } else {
                damage = math.random(minDamage, maxDamage);
                fate = "Hit";
            }
        }
        const clashResult = {
            damage,
            u_damage: damage,
            fate,
            roll: hitRoll
        };

        const reaction = ability.target!.getReaction(ability.getState());
        const reactionUpdate = reaction?.react(ability.getState(), clashResult);

        damage = math.clamp(damage, 0, 1000);
        return {
            ...clashResult,
            defendAttemptSuccessful: reaction?.defendAttemptSuccessful ?? false,
            defendAttemptName: reaction?.name ?? "",
            defendReactionUpdate: reactionUpdate ?? {},
        };
    }

    public calculateDamage(attacker: EntityState, target: EntityState, ability: AbilityState): number {
        // ...implementation...
    }

    public applyDamage(targetId: number, amount: number): void {
        // ...implementation...
    }

    private rollHit(acc: number, attacker: EntityState, defender: EntityState): HitResult {
        const hitRoll = math.random(1, 100);
        const hitChance = acc - calculateRealityValue(Reality.Maneuver, defender.stats);
        const critChance = calculateRealityValue(Reality.Precision, attacker.stats);
        return { hitRoll, hitChance, critChance };
    }
}

