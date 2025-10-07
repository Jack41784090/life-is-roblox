import { uniformRandom } from "shared/utils";
import Logger, { ContextLogger } from "shared/utils/Logger";
import { iSquadEntity } from "squad-battle/Entity/type";
import { EntityUpdate } from "squad-battle/type";
import { iOneClash, iOneClashConfig, iSkill } from "./type";

export class OneClash implements iOneClash {
    private logger: ContextLogger;
    private attacker: iSquadEntity;
    private targets: iSquadEntity[];

    private defender?: iSquadEntity;
    private source?: iSkill;

    constructor(config: iOneClashConfig) {
        this.attacker = config.attacker;
        this.defender = config.defender;
        this.targets = config.targets ?? [this.defender ?? this.attacker];
        this.source = config.source;
        this.logger = Logger.createContextLogger(`${config.attacker.playerID}->${config.defender?.playerID ?? config.attacker.playerID}`);
    }

    private targetManifestation(): iSquadEntity {
        assert(this.defender, `No defender`)
        assert(this.targets?.size() === 0 || this.targets?.includes(this.defender), `Targets do not include provided defender`)
        return this.defender;
    }

    private rollForHit(e?: iSquadEntity): EntityUpdate[] | undefined {
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

    private rollForPierce(e?: iSquadEntity): EntityUpdate[] | undefined {
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

    private damageCalculation(e?: iSquadEntity) {
        const chosenWeapon = this.attacker.weapon; //temp
        const target = this.targetManifestation();
        const armour = target.get_armour();
        const dm = armour.getRawDamageTaken(chosenWeapon.getPotencyArrayDamage(target))
        return target.damage(dm, target.playerID);
    }

    commit(): EntityUpdate[] {
        return this.rollForHit() || this.rollForPierce() || this.damageCalculation();
    }
}