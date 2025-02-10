export interface CConfig {
    id: string;
    displayName: string;
    spawnLocation: Vector3;
}

export enum CState {
    IDLE = 'idle',
    START_WALK = "starting to walk",
    ACCELERATE = 'accelerate',
    DECELERATE = 'decelerate',
    FULL_WALK = 'fully walking',
    TALKING = 'talking',
}
