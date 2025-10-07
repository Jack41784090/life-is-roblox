import { EventBus } from "shared/class/battle/Events/EventBus";
import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { iSquadEntity } from "squad-battle/Entity/type";
import { EntityUpdate } from "squad-battle/type";
import { DamageEffectData, iOneClash, iOneClashConfig, iSkill, iSkillEffect } from './type';

export class OneClash implements iOneClash {
    private updates: EntityUpdate[] = [];

    private eventBus: EventBus;
    private logger: ContextLogger;
    private attacker: iSquadEntity;
    private targets: iSquadEntity[];

    private defender?: iSquadEntity;
    private skill: iSkill;

    constructor(config: iOneClashConfig) {
        this.attacker = config.attacker;
        this.defender = config.defender;
        this.targets = config.targets ?? [this.defender ?? this.attacker];
        this.skill = config.skill;
        this.logger = Logger.createContextLogger(`${config.attacker.playerID}->${config.defender?.playerID ?? config.attacker.playerID}`);
        this.eventBus = new EventBus();
    }

    private applyEffect(statusEffectdata: iSkillEffect): EntityUpdate[] | undefined {
        const target = this.targetManifestation();
        if (statusEffectdata.destroyOnTrigger) {
            const index = target.statusEffects.indexOf(statusEffectdata);
            if (index > -1) {
                target.statusEffects.remove(index);
            }
        }

        switch (statusEffectdata.effect.type) {
            case 'ApplyStatusEffect': {
                this.logger.debug(`Applying status effect`, statusEffectdata.effect);
                // target.statusEffects.push(statusEffectdata);
                // return [{
                //     property: 'STATUS_EFFECT',
                //     from: -1,
                //     to: -1,
                // }];
                break;
            }
            case 'Damage': {
                const de = statusEffectdata.effect as DamageEffectData;
                if (statusEffectdata.destroyOnTrigger) {
                    // this.logger.debug(`Removing one-time effect`, statusEffectdata);
                }
                return target.damage(de.amount ?? 0, this.attacker.playerID);
            }

            case 'Heal': {
                const h = target.heal(statusEffectdata.effect.amount ?? 0)
                if (!h) return;
                return [{
                    source: this.attacker.playerID,
                    affected: target.playerID,
                    change: h,
                }];
            }

            case 'ModifyStat': {
                this.logger.debug(`Modifying stat`, statusEffectdata.effect);
                break;
            }
        }
    }

    private registerExistingSE() {
        this.attacker.statusEffects.forEach(se => {
            this.eventBus.subscribe(se.trigger, () => {
                this.applyEffect(se)?.forEach(u => this.updates.push(u));
            });
        })
        this.defender?.statusEffects.forEach(se => {
            this.eventBus.subscribe(se.trigger, () => {
                this.applyEffect(se)?.forEach(u => this.updates.push(u));
            });
        })
    }

    private registerSkillSE() {
        this.skill.effects.forEach(e => {
            if (e.affected === 'self') {
                this.attacker.statusEffects.push(e);
            }
            else if (e.affected === 'target') {
                this.targets.forEach(t => t.statusEffects.push(e));
            }
        })
    }

    private targetManifestation(): iSquadEntity {
        assert(this.defender, `No defender`)
        assert(this.targets?.size() === 0 || this.targets?.includes(this.defender), `Targets do not include provided defender`)
        return this.defender;
    }

    private rollForHit(): EntityUpdate[] | undefined {
        // this.eventBus.emit()

        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();

        const tryHit = chosenWeapon.getTotalHitValue(this.attacker);
        const hitDef = armour.getDV();
        const rollOffence_hit = uniformRandom(0, tryHit);
        const rollDefence_hit = uniformRandom(0, hitDef);
        if (rollDefence_hit >= rollOffence_hit) {
            return [{
                source: this.attacker.playerID,
                affected: target.playerID,
                change: {
                    property: 'DODGE',
                    from: -1,
                    to: -1,
                }
            }];
        }

        // return [];
    }

    private rollForPierce(): EntityUpdate[] | undefined {
        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();

        const tryHit = chosenWeapon.getTotalPenetrationValue(this.attacker);
        const hitDef = armour.getPV();
        const rollOffence_hit = uniformRandom(0, tryHit);
        const rollDefence_hit = uniformRandom(0, hitDef);
        if (rollDefence_hit >= rollOffence_hit) {
            return [{
                source: this.attacker.playerID,
                affected: target.playerID,
                change: {
                    property: 'CLINK',
                    from: -1,
                    to: -1,
                }
            }];
        }

        // return [];
    }

    private damageCalculation() {
        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();
        const dm = armour.getRawDamageTaken(chosenWeapon.getPotencyArrayDamage(target))

        this.eventBus.emit('OnBasicAttackHit', {
            attacker: this.attacker,
            defender: target,
            damage: dm,
            weapon: chosenWeapon,
        });
        return target.damage(dm, target.playerID);
    }

    private removeDestroyedSE() {
        this.attacker.statusEffects = this.attacker.statusEffects.filter(se => se.duration !== 0);
        if (this.defender) this.defender.statusEffects = this.defender.statusEffects.filter(se => se.duration !== 0);
    }

    commit(): EntityUpdate[] {
        this.registerSkillSE();
        this.registerExistingSE();
        const hit = this.rollForHit()?.forEach(u => this.updates.push(u));
        if (!hit) {
            this.removeDestroyedSE();
            return this.updates;
        }

        const pierce = this.rollForPierce()?.forEach(u => this.updates.push(u));
        if (!pierce) {
            this.removeDestroyedSE();
            return this.updates;
        }

        const damage = this.damageCalculation()?.forEach(u => this.updates.push(u));
        this.removeDestroyedSE();
        return this.updates;
    }
}

// export class StatusEffect implements iSkillEffect {
//     trigger: TriggerType;
//     conditions?: iSkillCondition[] | undefined;
//     effect: iSkillEffectData;
//     destroyOnTrigger?: boolean | undefined;
//     constructor(c: iSkillEffect & { affected: iSquadEntity }) {
//         this.trigger = c.trigger;
//         this.conditions = c.conditions;
//         this.effect = c.effect;
//         this.destroyOnTrigger = this.destroyOnTrigger;
//     }

//     public triggerIfAppropriate(trigger: TriggerType) {
//         if (trigger === this.trigger) {

//         }
//     }

//     private apply() {
//         switch (this.effect.type) {
//             case 'ApplyStatusEffect': {

//             }
//         }
//     }
// }
