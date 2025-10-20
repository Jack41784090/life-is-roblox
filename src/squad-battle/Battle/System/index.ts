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

    private applyEffect(statusEffectdata: iSkillEffect, metadata: unknown, isFromCurrentSkill: boolean = false): EntityUpdate[] | undefined {
        // metadata format
        //  attacker: this.attacker,
        //  defender: target,
        //  damage: dm,
        //  weapon: chosenWeapon,
        this.logger.debug(`Applying effect`, statusEffectdata);
        const attacker = (metadata as { attacker: iSquadEntity }).attacker;
        const target = (metadata as { defender: iSquadEntity }).defender;

        if (statusEffectdata.duration > 0) {
            const index = target.statusEffects.indexOf(statusEffectdata);
            if (index > -1) {
                const updatedEffect = { ...statusEffectdata, duration: statusEffectdata.duration - 1 };
                target.statusEffects[index] = updatedEffect;
                this.logger.debug(`Decremented duration: ${statusEffectdata.effect.type} from ${statusEffectdata.duration} to ${updatedEffect.duration}`);

                if (updatedEffect.duration === 0) {
                    this.logger.debug(`Duration expired, will be removed in cleanup`);
                }
            }
        }

        if (statusEffectdata.destroyOnTrigger) {
            this.logger.debug(`Removing one-time effect`, statusEffectdata);
            const index = target.statusEffects.indexOf(statusEffectdata);
            if (index > -1) {
                target.statusEffects.remove(index);
            }
        }

        const returnThis: EntityUpdate[] = [];

        // Only create PROC indicator for the skill being used in this clash, not for pre-existing status effects
        if (isFromCurrentSkill) {
            returnThis.push({
                source: this.attacker.playerID,
                affected: target.playerID,
                change: {
                    property: 'PROC',
                    from: -1,
                    to: -1,
                    metadata: {
                        effect: statusEffectdata,
                        skillName: this.skill.name,
                    }
                },
            });
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
                this.logger.debug(`Applying damage effect`, statusEffectdata.effect);
                const de = statusEffectdata.effect as DamageEffectData;
                // return target.damage(de.amount ?? 0, this.attacker.playerID);
                statusEffectdata.affected === 'self' ?
                    attacker.damage(de.amount ?? 0, this.attacker.playerID)
                        .forEach(u => returnThis.push(u)) :
                    target.damage(de.amount ?? 0, this.attacker.playerID)
                        .forEach(u => returnThis.push(u));
                break;
            }

            case 'Heal': {
                this.logger.debug(`Applying heal effect`, statusEffectdata.effect);
                const h = target.heal(statusEffectdata.effect.amount ?? 0)
                if (h) {
                    returnThis.push({
                        source: this.attacker.playerID,
                        affected: target.playerID,
                        change: h,
                    });
                }
                break;
            }

            case 'ModifyStat': {
                this.logger.debug(`Modifying stat`, statusEffectdata.effect);
                break;
            }
        }
        return returnThis;
    }

    private _seEffectDisconnects: (() => void)[] = [];
    private registerExistingSE() {
        this.attacker.statusEffects.forEach(se => {
            this.logger.debug(`Registering existing status effect`, se);
            const c = this.eventBus.subscribe(se.trigger, (metadata: unknown) => {
                this.applyEffect(se, metadata, false)?.forEach(u => this.updates.push(u));
            });
            this._seEffectDisconnects.push(c);
        })
        this.defender?.statusEffects.forEach(se => {
            this.logger.debug(`Registering existing status effect`, se);
            const c = this.eventBus.subscribe(se.trigger, (metadata: unknown) => {
                this.applyEffect(se, metadata, false)?.forEach(u => this.updates.push(u));
            });
            this._seEffectDisconnects.push(c);
        })
    }

    private registerSkillSE() {
        let hasCreatedSkillProc = false;

        this.skill.effects.forEach(e => {
            const targets = e.affected === 'self' ? [this.attacker] : this.targets;
            targets.forEach(target => {
                this.logger.debug(`Registering skill effect`, e);
                if (e.duration > 0) {
                    target.statusEffects.push(e);
                }

                const c = this.eventBus.subscribe(e.trigger, (metadata: unknown) => {
                    const shouldShowProc = !hasCreatedSkillProc;
                    if (shouldShowProc) {
                        hasCreatedSkillProc = true;
                    }
                    this.applyEffect(e, metadata, shouldShowProc)?.forEach(u => this.updates.push(u));
                });
                this._seEffectDisconnects.push(c);
            });
        })
    }

    private targetManifestation(): iSquadEntity {
        assert(this.defender, `No defender`)
        assert(this.targets?.size() === 0 || this.targets?.includes(this.defender), `Targets do not include provided defender`)
        return this.defender;
    }

    private rollForHit(): boolean {
        // this.eventBus.emit()

        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();

        const tryHit = chosenWeapon.getTotalHitValue(this.attacker);
        // const hitDef = armour.getDV();
        const hitDef = 0; //temp
        const rollOffence_hit = uniformRandom(0, tryHit);
        const rollDefence_hit = uniformRandom(0, hitDef);
        if (rollDefence_hit >= rollOffence_hit) {
            this.updates.push({
                source: this.attacker.playerID,
                affected: target.playerID,
                change: {
                    property: 'DODGE',
                    from: -1,
                    to: -1,
                }
            });
        }
        return rollOffence_hit > rollDefence_hit;
        // return [];
    }

    private rollForPierce(): boolean {
        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();

        const tryHit = chosenWeapon.getTotalPenetrationValue(this.attacker);
        const hitDef = armour.getPV();
        const rollOffence_hit = uniformRandom(0, tryHit);
        const rollDefence_hit = uniformRandom(0, hitDef);
        if (rollDefence_hit >= rollOffence_hit) {
            this.updates.push({
                source: this.attacker.playerID,
                affected: target.playerID,
                change: {
                    property: 'CLINK',
                    from: -1,
                    to: -1,
                }
            });
        }
        return rollOffence_hit > rollDefence_hit;
    }

    private damageCalculation(): void {
        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();
        const dm = armour.getRawDamageTaken(chosenWeapon.getPotencyArrayDamage(target))

        const d = target.damage(dm, this.attacker.playerID);
        d.forEach(u => this.updates.push(u));
        this.eventBus.emit('OnBasicAttackHit', {
            attacker: this.attacker,
            defender: target,
            damage: dm,
            weapon: chosenWeapon,
        });

        if (d.some(u => u.change.property === 'HP' && (u.change.to - u.change.from < 0))) {
            this.eventBus.emit('OnDamageTaken', {
                attacker: this.attacker,
                defender: target,
                damage: dm,
                weapon: chosenWeapon,
            });
        }
    }

    private removeDestroyedSE() {
        const attackerBefore = this.attacker.statusEffects.size();
        this.attacker.statusEffects = this.attacker.statusEffects.filter(se => {
            const keep = se.duration !== 0;
            if (!keep) {
                this.logger.debug(`Removing expired status effect: ${se.effect.type} (duration reached 0)`);
            }
            return keep;
        });

        if (attackerBefore > this.attacker.statusEffects.size()) {
            this.logger.debug(`Attacker: ${attackerBefore - this.attacker.statusEffects.size()} status effect(s) removed`);
        }

        if (this.defender) {
            const defenderBefore = this.defender.statusEffects.size();
            this.defender.statusEffects = this.defender.statusEffects.filter(se => {
                const keep = se.duration !== 0;
                if (!keep) {
                    this.logger.debug(`Removing expired status effect: ${se.effect.type} (duration reached 0)`);
                }
                return keep;
            });

            if (defenderBefore > this.defender.statusEffects.size()) {
                this.logger.debug(`Defender: ${defenderBefore - this.defender.statusEffects.size()} status effect(s) removed`);
            }
        }
    }

    private disconnectAll() {
        this.logger.debug(`Disconnecting all status effect listeners`);
        this._seEffectDisconnects.forEach(disconnect => disconnect());
    }

    public commit(): EntityUpdate[] {
        this.registerExistingSE();
        this.registerSkillSE();

        const hit = this.rollForHit();
        if (!hit) {
            return this.cleanup();
        }

        const pierce = this.rollForPierce();
        if (!pierce) {
            return this.cleanup();
        }

        this.damageCalculation();
        return this.cleanup();
    }

    private cleanup() {
        this.removeDestroyedSE();
        this.disconnectAll();
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
