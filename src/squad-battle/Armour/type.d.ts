export interface iArmour {
    getDV(): number;
    getPV(): number;
    getRawDamageTaken(damageTypesArray: Record<string, number>): number; // TODO: Define DamageType
    getState(): any; // TODO: Define ArmourState
}