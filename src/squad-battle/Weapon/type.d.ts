
import { iSkill } from "squad-battle/Battle/System/type";
import { iSquadEntity } from "squad-battle/Entity/type";
import { SquadEntityInSquadLocation } from "squad-battle/type";

export interface iWeapon {
    getRangeAtLocation(loc: SquadEntityInSquadLocation): SquadEntityInSquadLocation[];
    getTotalPenetrationValue(attacker: iSquadEntity): number;  // TODO: Define proper attacker type
    getTotalHitValue(attacker: iSquadEntity): number;
    getPotencyArrayDamage(attacker: iSquadEntity): Record<string, number>; // TODO: Define Potency enum
    getWeaponSkills(): iSkill[];
}