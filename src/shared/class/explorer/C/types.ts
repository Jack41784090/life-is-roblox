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
    // New physics parameters
    inertiaFactor: number;         // How strongly inertia affects movement (higher = more resistance to change)
    momentumRetention: number;     // How much momentum is retained between frames (0-1)
    directionChangeResistance: number; // How hard it is to change direction at high speeds (higher = harder)
    turnSpeedAtMaxVelocity: number;    // Turn speed multiplier when at max velocity
}
