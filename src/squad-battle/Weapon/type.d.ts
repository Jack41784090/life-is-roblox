
import { iSquadEntity } from "squad-battle/Entity/type";

export interface iWeapon {
    getTotalPenetrationValue(attacker: iSquadEntity): number;  // TODO: Define proper attacker type
    getTotalHitValue(attacker: iSquadEntity): number;
    getPotencyArrayDamage(attacker: iSquadEntity): Record<string, number>; // TODO: Define Potency enum
}