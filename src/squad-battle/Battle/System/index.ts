import Object from "@rbxts/object-utils";
import { EventBus } from "shared/class/battle/Events/EventBus";
import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { iSquadEntity } from "squad-battle/Entity/type";
import { EntityUpdate } from "squad-battle/type";
import { DamageEffectData, iOneClash, iOneClashConfig, iSkill, iSkillCondition, iSkillEffect, iSkillEffectData, TriggerType } from './type';

export class OneClash implements iOneClash {
    private updates: EntityUpdate[] = [];

    private eventBus: EventBus;
    private logger: ContextLogger;
    public attacker: iSquadEntity;
    private targets: iSquadEntity[];

    public defender?: iSquadEntity;
    public skill: iSkill;
    private _seEffectDisconnects: (() => void)[] = [];

    constructor(config: iOneClashConfig) {
        this.attacker = config.attacker;
        this.defender = config.defender;
        this.targets = config.targets ?? [this.defender ?? this.attacker];
        this.skill = config.skill;
        this.logger = Logger.createContextLogger(`${config.attacker.playerID}->${config.defender?.playerID ?? config.attacker.playerID}`);
        this.eventBus = new EventBus();
    }

    //#region Helpers
    private _targetManifestation(): iSquadEntity {
        assert(this.defender, `No defender`)
        assert(this.targets?.size() === 0 || this.targets?.includes(this.defender), `Targets do not include provided defender`)
        return this.defender;
    }
    private _removeDestroyedSE() {
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
    //#endregion

    //#region Blackbox

    private subscribeExistingSEToEventBus() {
        this.attacker.statusEffects.forEach(se => {
            this.logger.debug(`A:Registering existing status effect`, se);
            this._seEffectDisconnects.push(se.subscribe!(this.eventBus, this.updates));
        })
        this.defender?.statusEffects.forEach(se => {
            this.logger.debug(`D:Registering existing status effect`, se);
            this._seEffectDisconnects.push(se.subscribe!(this.eventBus, this.updates));
        })
    }

    private subscribeNewSkillSEToEventBus() {
        // let hasCreatedSkillProc = false;

        this.skill.effects.forEach(e => {
            const targets = e.affected === 'self' ? [this.attacker] : this.targets;
            targets.forEach(target => {
                this.logger.debug(`Registering skill effect`, e);
                const effectWithId = e
                const se = new PersistentSkillEffect(effectWithId, this, target);
                target.statusEffects.push(se);
                // const c = this.eventBus.subscribe(e.trigger, (metadata: unknown) => {
                //     const shouldShowProc = !hasCreatedSkillProc;
                //     if (shouldShowProc) {
                //         hasCreatedSkillProc = true;
                //     }
                //     this.applyEffect(effectWithId, metadata, shouldShowProc)?.forEach(u => this.updates.push(u));
                // });
                this._seEffectDisconnects.push(se.subscribe!(this.eventBus, this.updates));
            });
        })
    }

    private rollForHit(): boolean {
        // this.eventBus.emit()

        const chosenWeapon = this.attacker.weapon; //temp
        const target = this._targetManifestation();
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
        const target = this._targetManifestation();
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
        const target = this._targetManifestation();
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

    private disconnectAll() {
        this.logger.debug(`Disconnecting all status effect listeners`);
        this._seEffectDisconnects.forEach(disconnect => disconnect());
    }

    private cleanup() {
        this._removeDestroyedSE();
        this.disconnectAll();
        return this.updates;
    }
    //#endregion

    public commit(): EntityUpdate[] {
        this.subscribeExistingSEToEventBus();
        this.subscribeNewSkillSEToEventBus();

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

}

export class PersistentSkillEffect implements iSkillEffect {
    instanceId: string;
    name: string = '';
    affected: 'self' | 'target' = 'self'
    original_source: number;
    affected_id: number;
    duration: number;
    trigger: TriggerType;
    conditions: iSkillCondition[] = [];
    effect: iSkillEffectData;
    destroyOnTrigger: boolean = false;

    public icon: string;

    private logger: ContextLogger;
    private attacker: iSquadEntity;
    private target: iSquadEntity;
    private associatedClash: OneClash;

    private _generateStatusEffectId(): string {
        return `se_${tick()}_${math.random() * 1000000}`;
    }
    constructor(c: iSkillEffect, clash: OneClash, target: iSquadEntity) {
        Object.assign(this, c);
        this.instanceId = this._generateStatusEffectId();
        this.trigger = c.trigger;
        this.conditions = c.conditions ?? [];
        this.effect = c.effect;
        this.destroyOnTrigger = this.destroyOnTrigger;
        this.icon = c.icon ?? '!';

        this.duration = c.duration;
        this.original_source = clash.attacker.playerID;
        this.affected_id = target.playerID
        this.target = target;
        this.attacker = clash.attacker;
        this.associatedClash = clash;

        this.logger = Logger.createContextLogger(`skill:${this.original_source}=>${this.affected_id}:${c.icon ?? ''}`)
    }

    public subscribe = (eventBus: EventBus, output_array: EntityUpdate[]) => {
        return eventBus.subscribe(this.trigger, (metadata: unknown) => {
            this.apply().forEach(u => output_array.push(u));
        });
    }

    private decrementDuration() {
        const target = this.target;
        if (this.duration > 0) {
            // Find by instanceId if available, otherwise fall back to indexOf
            const index = this.instanceId
                ? target.statusEffects.findIndex(se => se.instanceId === this.instanceId)
                : target.statusEffects.indexOf(this);

            if (index > -1) {
                this.duration--;
                this.logger.debug(`Decremented duration: ${this.effect.type} [${this.instanceId}] from ${this.duration} to ${this.duration}`);

                if (this.duration === 0) {
                    this.logger.debug(`Duration expired, will be removed in cleanup`);
                }
            }
        }
        else {
            this.logger.debug(`Duration expired, will be removed in cleanup`);
        }
    }

    private apply(): EntityUpdate[] {
        // metadata format
        //  attacker: this.attacker,
        //  defender: target,
        //  damage: dm,
        //  weapon: chosenWeapon,
        this.logger.debug(`Applying effect`);
        const attacker = this.attacker;
        const target = this.target

        this.decrementDuration();
        this.destroyIfOneTime();

        const updates: EntityUpdate[] = [];
        updates.push({
            source: attacker.playerID,
            affected: target.playerID,
            change: {
                property: 'PROC',
                from: this.duration + 1,
                to: this.duration,
                metadata: {
                    effectInstanceId: this.instanceId,
                    display: this.associatedClash.skill.name,
                    targetDisplay: this.icon
                }
            },
        });
        switch (this.effect.type) {
            case 'ApplyStatusEffect': {
                this.logger.debug(`Attempting to apply status effect`);
                const skill = SkillFactory(this.effect.skillId, this.effect.duration);
                if (skill) {
                    const e = new PersistentSkillEffect(skill, this.associatedClash, target)
                    target.statusEffects.push(e)
                    this.logger.debug("Pushed effect, ", e)
                    updates.push({
                        source: attacker.playerID,
                        affected: target.playerID,
                        change: {
                            property: 'PROC',
                            from: 0,
                            to: e.duration,
                            metadata: {
                                effectInstanceId: e.instanceId,
                                display: e.name,
                                targetDisplay: this.icon
                            }
                        },
                    })
                }
                else {
                    this.logger.error("Cannot find skill of id: " + this.effect.skillId);
                }
                break;
            }

            case 'Damage': {
                this.logger.debug(`Applying damage effect`, this.effect);
                const de = this.effect as DamageEffectData;
                // return target.damage(de.amount ?? 0, this.attacker.playerID);
                this.affected === 'self' ?
                    attacker.damage(de.amount ?? 0, this.attacker.playerID)
                        .forEach(u => updates.push(u)) :
                    target.damage(de.amount ?? 0, this.attacker.playerID)
                        .forEach(u => updates.push(u));
                break;
            }

            case 'Heal': {
                this.logger.debug(`Applying heal effect`, this.effect);
                const h = target.heal(this.effect.amount ?? 0)
                if (h) {
                    updates.push({
                        source: this.attacker.playerID,
                        affected: target.playerID,
                        change: h,
                    });
                }
                break;
            }

            case 'ModifyStat': {
                this.logger.debug(`Modifying stat`, this.effect);
                break;
            }
        }
        return updates;
    }

    private destroyIfOneTime() {
        const target = this.target;
        if (this.destroyOnTrigger) {
            this.logger.debug(`Removing one-time effect`, this);
            const index = target.statusEffects.indexOf(this);
            if (index > -1) {
                target.statusEffects.remove(index);
            }
        }
    }
}

function SkillFactory(skillName: string, duration: number): iSkillEffect | undefined {
    switch (skillName) {
        case 'SE_BLEED': {
            return {
                name: skillName,
                affected: 'target',
                original_source: -1,
                affected_id: -1,
                trigger: 'OnDamageTaken',
                effect: {
                    type: 'Damage',
                    damageType: 'Physical',
                    amount: 1,
                    // calculation?: ;
                } as DamageEffectData,
                duration,
            }
        }
    }
}

