import { Atom, atom } from "@rbxts/charm";
import { ReplicatedStorage, RunService, TweenService, Workspace } from "@rbxts/services";
import { setTimeout } from "@rbxts/set-timeout";
import AnimationHandler, { AnimationType } from "shared/class/battle/State/Entity/Graphics/AnimationHandler";
import { uiFolder } from "shared/const/assets";
import { copyVector3, disableCharacter, enableCharacter, formatVector3, mapRange } from "shared/utils";
import Logger from "shared/utils/Logger";
import Place from "../Place";
import Going from "./Going";
import { CConfig, CState, MovementConfig } from "./types";

//#region Constants
const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
    maxWalkSpeed: 8,
    maxAcc: 0.25,
    accSpeed: 0.8,
    decelerateMultiplier: 9.5,
    sprintMultiplier: 2.5,
    turnSpeed: 8.0,
    inertiaFactor: 1.0,
    momentumRetention: 0.7,
    directionChangeResistance: 0.7,
    turnSpeedAtMaxVelocity: 0.3,
};

const DESTINATION_THRESHOLD = 3; // Threshold for reaching destination
const WAYPOINT_THRESHOLD = 1; // Threshold for reaching destination
const DEFAULT_FACING_DIRECTION = new Vector3(0, 0, -1);
const MAX_POSITION_DELTA = 10; // Maximum reasonable position change per frame
const POSITION_VALIDITY_THRESHOLD = 1e6;
const MOMENTUM_CLEANUP_THRESHOLD = 0.05;
//#endregion

/**
 * Character controller for NPC entities
 * Handles movement physics, animations, and pathfinding
 */
export default class C {
    //#region PROPERTIES:
    //#region Infrastructure
    protected logger = Logger.createContextLogger("C");
    protected associatedPlace?: Place;
    protected id: string;
    protected model: Model = new Instance('Model');
    protected humanoid: Humanoid;
    protected animationHandler: AnimationHandler;
    protected connections: Array<() => void> = [];
    protected state: CState = CState.IDLE;
    protected prevState = CState.IDLE;
    protected visible: boolean = true;

    // UI Components
    protected nameTag?: BillboardGui;
    private nameTagLabel?: TextBox;
    private speechBubble = uiFolder.WaitForChild('speechbubble').Clone() as Part;
    private speechBubbleTextBox = this.speechBubble.FindFirstChildOfClass('BillboardGui')?.FindFirstChildOfClass('TextBox') as TextBox;
    //#endregion

    //#region Movement Properties
    // Basic movement state
    protected hurrying = false;
    protected walkingDirection = new Vector3();
    protected facingDirection = copyVector3(DEFAULT_FACING_DIRECTION)
    protected targetFacingDirection = copyVector3(DEFAULT_FACING_DIRECTION)
    protected walkSpeedFractionAtom: Atom<number>;
    protected walkSpeedTracker: RBXScriptConnection;

    // Movement config values
    protected movementConfig: MovementConfig;
    protected maxWalkSpeed: number;
    protected maxAcc: number;
    protected acc: Atom<number> = atom(0);
    protected accSpeed: number;
    protected decelerateMultiplier: number;
    protected sprintMultiplier: number;

    // Physics state
    protected velocity = new Vector3();
    protected lastPosition: Vector3;
    protected momentum = new Vector3();
    protected intendedDirection = new Vector3();
    //#endregion

    //#region Pathfinding
    protected currentDestination?: Vector3;
    protected currentGoing?: Going;
    protected currentWaypoint?: PathWaypoint;
    private waypointArriveTimeout?: ReturnType<typeof setTimeout>;
    //#endregion

    //#endregion

    /**
     * Creates a character controller
     * @param config The character configuration
     * @param place The place this character belongs to
     */
    constructor(config: CConfig, place?: Place) {
        this.id = config.id;
        this.associatedPlace = place;
        this.spawn(config);

        // Initialize movement configuration with defaults or provided config
        this.movementConfig = config.movementConfig ?? DEFAULT_MOVEMENT_CONFIG;
        this.maxWalkSpeed = this.movementConfig.maxWalkSpeed;
        this.maxAcc = this.movementConfig.maxAcc;
        this.accSpeed = this.movementConfig.accSpeed;
        this.decelerateMultiplier = this.movementConfig.decelerateMultiplier;
        this.sprintMultiplier = this.movementConfig.sprintMultiplier;

        // Initialize humanoid and animation handler
        const humanoid = this.model.WaitForChild('Humanoid') as Humanoid;
        assert(humanoid.IsA('Humanoid'), `Humanoid not found in model '${this.id}'`);
        const animator = humanoid.WaitForChild('Animator') as Animator;
        assert(animator.IsA('Animator'), `Animator not found in model '${this.id}'`);
        this.animationHandler = new AnimationHandler(humanoid, animator, this.model);
        this.humanoid = humanoid;

        // Store initial position
        this.lastPosition = this.getPosition();

        // Initialize walkspeed tracker
        this.walkSpeedFractionAtom = atom(humanoid.WalkSpeed / this.maxWalkSpeed);
        this.walkSpeedTracker = this.humanoid.GetPropertyChangedSignal('WalkSpeed').Connect(() => {
            this.walkSpeedFractionAtom(this.humanoid.WalkSpeed / this.maxWalkSpeed);
        });

        // Set up main update loop
        this.initializeUpdateLoop();
    }

    //#region Initialization Methods
    /**
     * Sets up the main update loop for the character
     */
    private initializeUpdateLoop(): void {
        const renderSteppedConnection = RunService.RenderStepped.Connect(dt => {
            this.updateMovementPhysics(dt);
            this.stateUpdater();
            this.stateChangeTracker();
            this.accelerationTracker(dt);
            this.thoughtProcessTracker();
        });

        this.connections.push(() => renderSteppedConnection.Disconnect());
    }

    /**
     * Spawns the character model in the world
     */
    private spawn(config: CConfig): void {
        try {
            const template = ReplicatedStorage.WaitForChild('Models')
                .WaitForChild("NPCs")
                .WaitForChild(this.id) as Model;
            assert(template.IsA('Model'), `Model '${this.id}' not found`);
            this.model = template.Clone();
            this.model.Parent = this.associatedPlace ? this.associatedPlace.getModel() : Workspace;
            this.model.Name = config.displayName;
            this.model.PrimaryPart!.CFrame = new CFrame(config.spawnLocation);
            this.nameTag = this.model.FindFirstChild('nametag')?.FindFirstChildOfClass('BillboardGui') as BillboardGui;
            this.nameTagLabel = this.nameTag?.FindFirstChildOfClass('TextBox') as TextBox;
        } catch (e) {
            this.logger.warn(`Failed to spawn: ${e}`);
        }
    }
    //#endregion

    //#region Movement Physics
    /**
     * Updates character movement physics
     * @param dt Delta time since last frame
     */
    private updateMovementPhysics(dt: number): void {
        // Safety check for extreme delta time values
        if (dt <= 0 || dt > 1) {
            return;
        }

        // Get current position with safety checks
        const currentPosition = this.getPosition();
        if (!this.lastPosition) {
            this.lastPosition = currentPosition;
            return;
        }

        // Validate current position is within reasonable bounds
        if (!this.isValidPosition(currentPosition)) {
            this.logger.warn(`Invalid position detected: ${currentPosition}`);
            // Reset to last known good position if we have one
            if (this.isValidPosition(this.lastPosition)) {
                this.resetToPosition(this.lastPosition);
            }
            return;
        }

        // Validate facing vectors
        this.validateFacingVectors();

        // Calculate horizontal velocity with position change limit
        const horizontalDelta = this.calculateHorizontalDelta(currentPosition);

        // Update velocity and position tracking
        this.velocity = horizontalDelta.div(dt);
        this.lastPosition = currentPosition;

        // Apply momentum physics and calculate target direction
        this.updateMomentum(dt);
        if (this.walkingDirection.Magnitude > 0) {
            this.calculateTargetDirection();
        }

        // Update facing direction with dynamic turn speed
        this.updateFacingDirection(dt);
    }

    /**
     * Ensures facing vectors are valid
     */
    private validateFacingVectors(): void {
        if (!this.isValidVector(this.facingDirection)) {
            this.logger.warn(`Invalid facing direction detected: ${this.facingDirection}`);
            this.facingDirection = copyVector3(DEFAULT_FACING_DIRECTION)
        }
        if (!this.isValidVector(this.targetFacingDirection)) {
            this.logger.warn(`Invalid target facing direction detected: ${this.targetFacingDirection}`);
            this.targetFacingDirection = copyVector3(DEFAULT_FACING_DIRECTION)
        }
    }

    /**
     * Calculates horizontal movement delta with safety limits
     */
    private calculateHorizontalDelta(currentPosition: Vector3): Vector3 {
        return new Vector3(
            math.clamp(currentPosition.X - this.lastPosition.X, -MAX_POSITION_DELTA, MAX_POSITION_DELTA),
            0,
            math.clamp(currentPosition.Z - this.lastPosition.Z, -MAX_POSITION_DELTA, MAX_POSITION_DELTA)
        );
    }

    /**
     * Updates the character's facing direction
     */
    private updateFacingDirection(dt: number): void {
        // Calculate angle between current and target direction for dynamic turning
        const dotProduct = this.facingDirection.Dot(this.targetFacingDirection);
        const angleSize = 1 - math.abs(dotProduct); // 0 when parallel, 1 when perpendicular

        // Apply faster turning for sharper turns but slower at high speeds
        const dynamicTurnSpeed = this.calculateDynamicTurnSpeed();
        const turnFactor = 1 + (angleSize * 2);
        const adjustedTurnSpeed = dynamicTurnSpeed * turnFactor;

        // Safe interpolation between vectors with dynamic turn speed
        this.facingDirection = this.safeLerp(
            this.facingDirection,
            this.targetFacingDirection,
            math.min(1, dt * adjustedTurnSpeed)
        );

        // Only adjust orientation if we're actually moving
        if (this.momentum.Magnitude < 0.1) return;


        // Apply rotation to model without changing position
        const rootPart = this.model.PrimaryPart;
        if (!rootPart) return;

        // Create a safe look vector that preserves Y position
        const currentPos = rootPart.Position;
        const facingVector = new Vector3(this.facingDirection.X, 0, this.facingDirection.Z).Unit;
        const targetPos = currentPos.add(facingVector);

        if (!this.isValidPosition(targetPos)) {
            return;
        }

        // Create a lookAt CFrame but only use it for direction
        const lookCFrame = CFrame.lookAt(currentPos, targetPos);

        // Only rotate the model, DO NOT change its position
        rootPart.CFrame = new CFrame(
            currentPos, // Keep current position exactly as is
            lookCFrame.LookVector.add(currentPos) // Only use the orientation
        );
    }

    /**
     * Calculates dynamic turn speed based on velocity
     */
    private calculateDynamicTurnSpeed(): number {
        const baseTurnSpeed = this.movementConfig.turnSpeed;
        const velocityMagnitude = this.velocity.Magnitude;
        const speedFraction = math.min(this.walkSpeedFractionAtom(), 1);

        // Linear interpolation between base turn speed and turn speed at max velocity
        const minTurnSpeedFactor = this.movementConfig.turnSpeedAtMaxVelocity;
        const speedFactor = 1 - (speedFraction * (1 - minTurnSpeedFactor));

        return baseTurnSpeed * speedFactor;
    }

    /**
     * Updates momentum based on current inputs and existing momentum
     */
    private updateMomentum(dt: number): void {
        if (!this.isValidVector(this.momentum)) {
            this.momentum = new Vector3();
        }

        // Calculate how much of previous momentum to retain
        const speedFactor = math.min(this.walkSpeedFractionAtom(), 1);
        const baseRetention = this.movementConfig.momentumRetention;
        const retention = math.clamp(baseRetention + (speedFactor * 0.05), 0, 0.98);

        // Update momentum based on walking direction
        this.applyMomentumPhysics(retention);

        // Apply the momentum to actual movement if significant
        this.applyMomentumToMovement();
    }

    /**
     * Applies momentum physics calculations
     */
    private applyMomentumPhysics(retention: number): void {
        if (this.walkingDirection.Magnitude > 0) {
            // Blend current momentum with new direction
            this.momentum = this.momentum.mul(retention).add(
                this.walkingDirection.mul(1 - retention)
            );
        } else {
            // When not providing input, just retain existing momentum with decay
            this.momentum = this.momentum.mul(retention * 0.98);
        }
    }

    /**
     * Applies momentum to actual character movement
     */
    private applyMomentumToMovement(): void {
        if (!this.humanoid) return;

        const momentumMagnitude = this.momentum.Magnitude;
        if (momentumMagnitude > 0 && momentumMagnitude < MOMENTUM_CLEANUP_THRESHOLD) {
            this.momentum = new Vector3();
        }

        this.humanoid.Move(this.momentum);
    }

    /**
     * Calculate target direction considering resistance to direction changes
     */
    private calculateTargetDirection(): void {
        // Store intended direction separately
        this.intendedDirection = this.walkingDirection.Unit;

        const resistanceFactor = math.min(
            this.walkSpeedFractionAtom(),
            1
        ) * this.movementConfig.directionChangeResistance;

        const momentumDir = this.momentum.Magnitude > 0.1 ? this.momentum.Unit : this.facingDirection;
        const dot = momentumDir.Dot(this.intendedDirection);
        const angleFactor = (1 - dot) * resistanceFactor;
        const blendFactor = math.clamp(angleFactor, 0, 0.9);

        this.targetFacingDirection = this.intendedDirection.Lerp(
            momentumDir,
            blendFactor
        ).Unit;

        this.logger.debug(`
            Intended Direction: ${formatVector3(this.intendedDirection)},
            Momentum Direction: ${formatVector3(momentumDir)},
            Dot Product: ${string.format("%.2f", dot)},
            Angle Factor: ${string.format("%.2f", angleFactor)},
            Blend Factor: ${string.format("%.2f", blendFactor)}
            Target Facing Direction: ${formatVector3(this.targetFacingDirection)},
        `);
    }
    //#endregion

    //#region Validation Utilities
    /**
     * Checks if a position is valid (not NaN, infinite, or extreme)
     */
    private isValidPosition(position: Vector3): boolean {
        return this.isValidVector(position);
    }

    /**
     * Checks if a vector is valid (not NaN, infinite, or extreme)
     */
    private isValidVector(vector: Vector3): boolean {
        if (
            !vector ||
            !typeIs(vector.X, "number") ||
            !typeIs(vector.Y, "number") ||
            !typeIs(vector.Z, "number") ||
            math.abs(vector.X) > POSITION_VALIDITY_THRESHOLD ||
            math.abs(vector.Y) > POSITION_VALIDITY_THRESHOLD ||
            math.abs(vector.Z) > POSITION_VALIDITY_THRESHOLD
        ) {
            this.logger.warn(`Invalid vector detected: ${vector}`);
            return false;
        }
        return true;
    }

    /**
     * Safely interpolate between vectors
     * 
     * Handles edge cases such as invalid vectors or zero magnitude results.
     * Ensures the interpolation alpha is clamped between 0 and 1, and returns a unit vector.
     */
    private safeLerp(v1: Vector3, v2: Vector3, alpha: number): Vector3 {
        // First ensure both vectors are valid
        if (!this.isValidVector(v1) || !this.isValidVector(v2)) {
            return copyVector3(DEFAULT_FACING_DIRECTION)
        }

        const safeAlpha = math.clamp(alpha, 0, 1);
        let result = v1.Lerp(v2, safeAlpha);

        if (!this.isValidVector(result)) {
            return copyVector3(DEFAULT_FACING_DIRECTION)
        }

        // Ensure we return a unit vector
        if (result.Magnitude < 0.001) {
            return copyVector3(DEFAULT_FACING_DIRECTION)
        } else {
            return result.Unit;
        }
    }

    /**
     * Reset character to a known good position
     */
    private resetToPosition(position: Vector3): void {
        if (!this.model || !this.model.PrimaryPart) {
            return;
        }

        // Safely teleport the character back to the valid position
        this.model.PrimaryPart.CFrame = new CFrame(position);
        this.velocity = new Vector3();
        this.acc(0);
        this.humanoid.WalkSpeed = 0;

        this.logger.warn(`Reset character to position: ${position}`);
    }
    //#endregion

    //#region UI and Communication
    /**
     * Displays a speech bubble with the given message
     */
    public speak(message: string) {
        if (!this.speechBubble || !this.speechBubbleTextBox || !this.model) {
            this.logger.warn(`Cannot speak - speech bubble components not initialized`);
            return;
        }

        const speechBubble = this.speechBubble;
        speechBubble.Transparency = 0;
        speechBubble.Parent = this.model;

        if (!this.model.PrimaryPart) {
            this.logger.warn(`Cannot position speech bubble - model has no PrimaryPart`);
            return;
        }

        speechBubble.CFrame = this.model.PrimaryPart.CFrame.add(new Vector3(0, 7, 0));
        this.speechBubbleTextBox.Text = message;

        setTimeout(() => {
            TweenService.Create(speechBubble, new TweenInfo(1), { Transparency: 1 }).Play();
        }, message.size() * 0.2);
    }

    /**
     * Sets the text displayed in the character's nametag
     */
    protected setNametag(mes: string) {
        const textbox = this.nameTagLabel;
        if (textbox) {
            textbox.Text = mes;
        }
    }
    //#endregion

    //#region Position and Movement
    /**
     * Gets the current character position with validation
     */
    public getPosition(): Vector3 {
        if (!this.model || !this.model.PrimaryPart) {
            return new Vector3();
        }

        const position = this.model.PrimaryPart.Position;

        // Validate position before returning
        if (this.isValidPosition(position)) {
            return position;
        } else {
            this.logger.warn(`Retrieved invalid position: ${position}`);
            return new Vector3();
        }
    }

    /**
     * Initiates movement in the specified direction
     */
    protected startMoving(direction: Vector3) {
        if (!direction || direction.Magnitude === 0) {
            this.logger.warn(`Attempted to move with invalid direction`);
            return;
        }

        // Make sure direction is valid
        if (!this.isValidVector(direction)) {
            this.logger.warn(`Invalid movement direction: ${direction}`);
            return;
        }

        const dir = direction.Unit;
        // Store the raw intended direction
        this.walkingDirection = dir;
        this.intendedDirection = dir;

        // Target facing direction will be calculated in updateMovementPhysics
        // with inertia and direction change resistance applied

        // Move is now handled by updateMomentum to incorporate inertia
    }

    /**
     * Stops the character's movement
     */
    protected stopMoving() {
        this.walkingDirection = new Vector3();
        this.intendedDirection = new Vector3();
        // Momentum will gradually decay in updateMomentum
    }

    /**
     * Toggles sprint/hurry mode
     */
    public setHurrying(hurrying: boolean): void {
        this.hurrying = hurrying;
    }
    //#endregion

    //#region Pathfinding
    /**
     * Sets a destination for the character to move to
     */
    public setDestination(destination: Vector3): boolean {
        this.currentDestination = destination;
        return true;
    }

    /**
     * Processes current waypoint and determines if character has reached it
     */
    private handleWaypoint(waypoint: PathWaypoint): boolean {
        // begin timeout
        this.waypointArriveTimeout = this.waypointArriveTimeout ?? setTimeout(() => {
            this.logger.warn(`Timeout at waypoint ${waypoint.Position}`);
            this.currentGoing?.destroy();
            this.currentGoing = undefined;
            this.currentWaypoint = undefined;
        }, 1)

        const currentPos = this.getPosition().mul(new Vector3(1, 0, 1));
        const waypointPos = waypoint.Position.mul(new Vector3(1, 0, 1));

        // look at the difference
        const diff = waypointPos.sub(currentPos);

        // if the difference is less than the threshold, then we reached the waypoint
        if (diff.Magnitude <= WAYPOINT_THRESHOLD) {
            this.logger.debug(`Reached waypoint ${formatVector3(waypointPos)}`);
            this.currentWaypoint = undefined
            this.waypointArriveTimeout?.();
            this.waypointArriveTimeout = undefined
            return false;
        }

        // otherwise, move to the waypoint
        this.startMoving(diff);
        return true;
    }

    /**
     * Manages pathfinding to the current destination
     */
    protected handleDestination() {
        if (!this.currentDestination) return;

        // want to go somewhere, but not going yet
        if (!this.currentGoing) {
            this.logger.debug(`Starting to go to ${formatVector3(this.currentDestination)}`);
            try {
                this.currentGoing = new Going({
                    destination: this.currentDestination,
                    characterModel: this.model,
                });
            } catch (e) {
                this.logger.warn(`Failed to initialize Going: ${e}`);
                this.currentDestination = undefined;
                return;
            }
            return;
        }

        // going somewhere, still thinking the path
        if (this.currentGoing.calculatingPath) {
            this.logger.debug(`Still calculating path to ${formatVector3(this.currentDestination)}`);
            return;
        }

        // not calculating, and is not calculated, so calculate
        if (this.currentGoing.isCalculated === false) {
            this.logger.debug(`Calculating path to ${formatVector3(this.currentDestination)}`);
            try {
                this.currentGoing.calculatePath();
            } catch (e) {
                this.logger.warn(`Failed to calculate path: ${e}`);
                this.currentGoing.destroy();
                this.currentGoing = undefined;
                this.currentDestination = undefined;
            }
            return;
        }

        // get the waypoint
        this.currentWaypoint = this.currentWaypoint ?? this.currentGoing.nextWaypoint();
        if (!this.currentWaypoint) {
            this.logger.debug(`No more waypoints`);
            this.currentGoing.destroy();
            this.currentGoing = undefined;

            const distanceToDestination = this.currentDestination.sub(this.getPosition()).Magnitude;
            this.logger.debug(`Distance to destination: ${distanceToDestination}`);
            if (distanceToDestination <= DESTINATION_THRESHOLD) {
                this.logger.debug(`Reached destination ${formatVector3(this.currentDestination)}`);
                this.currentDestination = undefined;
            }
            return;
        }

        this.handleWaypoint(this.currentWaypoint);
    }
    //#endregion

    //#region State and Animation Management
    /**
     * Main update loop for AI decision making
     */
    protected thoughtProcessTracker() {
        this.handleDestination();
    }

    /**
     * Handles animation state transitions based on current state
     */
    protected stateChangeTracker() {
        const ah = this.animationHandler;
        if (!ah) return;

        if (this.state !== this.prevState) {
            this.prevState = this.state;
        }

        switch (this.state) {
            case CState.IDLE:
                ah.playAnimationIfNotPlaying(AnimationType.Idle, {
                    animation: 'explore-idle',
                    loop: true,
                    priority: Enum.AnimationPriority.Idle
                });
                ah.killAnimationIfPlaying(AnimationType.Transition);
                ah.killAnimationIfPlaying(AnimationType.Move);
                ah.killAnimationIfPlaying(AnimationType.Sprint);
                break;

            case CState.START_WALK:
                const existingTransitionTrack = ah.getTrack(AnimationType.Transition);
                if (existingTransitionTrack && existingTransitionTrack.IsPlaying === false) {
                    this.state = CState.ACCELERATE;
                    ah.killAnimation(AnimationType.Transition);
                }
                else {
                    ah.playAnimationIfNotPlaying(AnimationType.Transition, {
                        animation: this.hurrying ? 'explore-idle->sprint' : 'explore-idle->walk',
                        loop: false,
                        priority: Enum.AnimationPriority.Action,
                        weightAtom: this.walkSpeedFractionAtom,
                        atomInterpreter: atom => math.min(atom() * 5, 1),
                        update: true,
                    });
                }
                break;

            case CState.ACCELERATE:
            case CState.DECELERATE:
            case CState.FULL_WALK:
                ah.playAnimationIfNotPlaying(AnimationType.Move, {
                    animation: 'explore-walk',
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    atomInterpreter: atom => {
                        const v = atom();
                        return v < 1 ? v : 1 - (v - 1);
                    },
                    priority: Enum.AnimationPriority.Movement,
                    update: true,
                });

                ah.playAnimationIfNotPlaying(AnimationType.Sprint, {
                    animation: 'explore-sprint',
                    loop: true,
                    weightAtom: this.walkSpeedFractionAtom,
                    atomInterpreter: atom => math.max(atom() - 1, 0),
                    priority: Enum.AnimationPriority.Movement,
                    update: true,
                });
                break;

            case CState.TALKING:
                // Would typically transition to talking animations here
                break;
        }
    }

    /**
     * Updates character state based on movement and velocity
     */
    protected stateUpdater() {
        const isMoving = this.walkingDirection.Magnitude > 0;
        const curSpd = this.humanoid.WalkSpeed;

        if (isMoving) {
            if (this.state === CState.IDLE) {
                this.state = CState.START_WALK;
            } else if (this.state === CState.START_WALK && curSpd > this.maxWalkSpeed * 0.5) {
                this.state = CState.ACCELERATE;
            } else if (this.state === CState.ACCELERATE && curSpd >= this.maxWalkSpeed) {
                this.state = CState.FULL_WALK;
            }
        } else {
            if (curSpd > 0) {
                this.state = CState.DECELERATE;
            } else {
                this.state = CState.IDLE;
            }
        }
    }

    /**
     * Updates character acceleration and speed with physics-based model
     */
    protected accelerationTracker(dt: number) {
        // Validate dt to prevent extreme acceleration changes
        if (dt <= 0 || dt > 1) {
            return;
        }

        const currentSpeed = this.humanoid.WalkSpeed;
        const currentAcceleration = this.acc();
        const intendOnMoving = this.walkingDirection.Magnitude > 0;

        // Calculate target speed based on movement intent and hurrying state
        const topSpeed = intendOnMoving ?
            this.hurrying ? this.maxWalkSpeed * this.sprintMultiplier : this.maxWalkSpeed :
            0;

        const humanoid = this.humanoid;
        const accelerationSpeed = this.accSpeed * (this.hurrying ? this.sprintMultiplier : 1);

        // Enhanced inertia for acceleration/deceleration
        if (currentSpeed < topSpeed) {
            // Apply acceleration with a more pronounced curve for natural feel
            const accelerationFactor = 1 - (currentSpeed / topSpeed);

            // Stronger initial acceleration boost with quadratic curve 
            const boostFactor = accelerationFactor * accelerationFactor * 1.5;

            // Calculate momentum alignment bonus - accelerate faster when moving in same direction
            let alignmentBonus = 1.0;
            if (this.velocity.Magnitude > 0.1 && this.walkingDirection.Magnitude > 0.1) {
                const alignmentDot = this.velocity.Unit.Dot(this.walkingDirection.Unit);
                // Bonus for moving in same direction, penalty for moving against momentum
                alignmentBonus = mapRange(alignmentDot, -1, 1, 0.5, 1.5);
            }

            this.acc(math.min(
                currentAcceleration + dt * accelerationSpeed * (1 + boostFactor) * alignmentBonus,
                this.maxAcc
            ));
        }
        else if (currentSpeed > topSpeed) {
            // Enhanced inertia-based deceleration
            const inertiaFactor = math.min(1 + (currentSpeed / this.maxWalkSpeed), this.movementConfig.inertiaFactor);
            const baseDelta = dt * accelerationSpeed * (0.8 + math.random() * 0.4);
            const inertiaBasedDeceleration = baseDelta / inertiaFactor;

            if (intendOnMoving) {
                // Calculate direction change penalty
                let directionChangePenalty = 1.0;
                if (this.velocity.Magnitude > 0.1 && this.walkingDirection.Magnitude > 0.1) {
                    const directionDot = this.velocity.Unit.Dot(this.walkingDirection.Unit);
                    // Higher penalty when changing direction sharply
                    directionChangePenalty = mapRange(directionDot, -1, 1, 1.8, 0.7);
                }

                // Gentle deceleration when still moving, with direction change penalty
                this.acc(math.max(
                    currentAcceleration - (inertiaBasedDeceleration * directionChangePenalty),
                    -0.1
                ));
            }
            else {
                // Stronger deceleration when stopping but still with inertia
                this.acc(
                    currentAcceleration - (inertiaBasedDeceleration * this.decelerateMultiplier)
                );
            }
        }

        // Ensure we don't go negative when stopped
        if (currentSpeed <= 0.1 && currentAcceleration < 0) {
            humanoid.WalkSpeed = 0;
            this.acc(0);
        }
        else {
            // Apply acceleration to walk speed
            if (this.hurrying) {
                humanoid.WalkSpeed = math.max(humanoid.WalkSpeed, this.maxWalkSpeed);
            }
            humanoid.WalkSpeed += this.acc();

            // Clamp to reasonable limits to prevent extreme values
            humanoid.WalkSpeed = math.clamp(
                humanoid.WalkSpeed,
                0,
                this.maxWalkSpeed * this.sprintMultiplier * 1.2
            );
        }

        // Update nametag with expanded debug info
        this.setNametag(
            `Speed: ${string.format("%.3f", humanoid.WalkSpeed)}/${string.format("%.1f", topSpeed)}` +
            `\nAcc: ${string.format("%.3f", this.acc())}` +
            `\nVel: ${string.format("%.3f", this.velocity.Magnitude)}` +
            `\nMomentum: ${string.format("%.2f", this.momentum.Magnitude)}`
        );
    }
    //#endregion

    //#region Lifecycle Management
    /**
     * Cleans up all resources used by this character
     */
    public destroy() {
        // Clean up connections first to prevent errors during destruction
        this.connections.forEach(conn => conn());
        this.connections = [];
        this.walkSpeedTracker?.Disconnect();

        if (this.animationHandler) {
            this.animationHandler.destroy();
            this.animationHandler = undefined!;
        }

        if (this.model) {
            this.model.Destroy();
        }
    }

    /**
     * Returns the character's model
     */
    public getModel() {
        return this.model;
    }

    /**
     * Returns the character's ID
     */
    public getModelID() {
        return this.id;
    }
    //#endregion

    public hide() {
        if (this.visible) {
            this.toggleVisibility();
        }
    }

    public show() {
        if (!this.visible) {
            this.toggleVisibility();
        }
    }

    public toggleVisibility() {
        this.logger.debug(`[${this.id}] Toggling visibility ${this.visible} => ${!this.visible}`);
        this.visible = !this.visible;
        if (this.model) {
            if (this.visible) {
                enableCharacter(this.model);
            }
            else {
                disableCharacter(this.model);
            }
        }
    }
}