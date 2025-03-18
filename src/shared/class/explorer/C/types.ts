export interface CConfig {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
    movementConfig?: MovementConfig;
}

export enum CState {
    IDLE = 'idle',
    START_WALK = "starting to walk",
    ACCELERATE = 'accelerate',
    DECELERATE = 'decelerate',
    FULL_WALK = 'fully walking',
    TALKING = 'talking',
}

export interface MovementConfig {
    maxWalkSpeed: number;
    maxAcc: number;
    accSpeed: number;
    decelerateMultiplier: number;
    sprintMultiplier: number;
    turnSpeed: number;
}
