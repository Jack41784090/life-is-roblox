export interface iWeapon {
    getTotalPenetrationValue(attacker: any): number;  // TODO: Define proper attacker type
    getTotalHitValue(attacker: any): number;
    getPotencyArrayDamage(attacker: any): Record<string, number>; // TODO: Define Potency enum
}