export interface CConfig {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
}

export enum CState {
    IDLE = 'idle',
    DECELERATE = 'decelerate',
    ACCELERATE = 'accelerate',
    FULL_WALK = 'sprinting',
    TALKING = 'talking',
    START_WALK = "START_WALK",
}
