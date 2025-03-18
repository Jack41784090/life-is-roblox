import { Atom, atom } from "@rbxts/charm";
import { ReplicatedStorage, RunService, TweenService } from "@rbxts/services";
import { setTimeout } from "@rbxts/set-timeout";
import AnimationHandler, { AnimationType } from "shared/class/battle/State/Entity/Graphics/AnimationHandler";
import { uiFolder } from "shared/const/assets";
import Place from "../Place";
import Going from "./Going";
import { CConfig, CState, MovementConfig } from "./types";

const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
    maxWalkSpeed: 8,
    maxAcc: 0.25,
    accSpeed: 0.8,
    decelerateMultiplier: 8.8,
    sprintMultiplier: 2.5,
    turnSpeed: 2,
};

export default class C {
    //#region infrastructure
    protected associatedPlace: Place;
    protected id: string;
    protected model: Model = new Instance('Model');
    protected humanoid: Humanoid;
    protected animationHandler: AnimationHandler;
    protected connections: Array<() => void> = [];
    protected state: CState = CState.IDLE;
    protected prevState = CState.IDLE;
    protected nameTag?: BillboardGui;
    private nameTagLabel?: TextBox;
    private speechBubble = uiFolder.WaitForChild('speechbubble').Clone() as Part;
    private speechBubbleTextBox = this.speechBubble.FindFirstChildOfClass('BillboardGui')?.FindFirstChildOfClass('TextBox') as TextBox;
    //#endregion

    //#region walking
    protected hurrying: boolean = false;
    protected walkingDirection: Vector3 = new Vector3();
    protected facingDirection: Vector3 = new Vector3(0, 0, -1); // Default facing direction
    protected targetFacingDirection: Vector3 = new Vector3(0, 0, -1);
    protected walkSpeedFractionAtom: Atom<number>;
    protected walkSpeedTracker: RBXScriptConnection;

    // Movement physics configuration
    protected movementConfig: MovementConfig;
    protected maxWalkSpeed: number;
    protected maxAcc: number;
    protected acc: Atom<number> = atom(0);
    protected accSpeed: number;
    protected decelerateMultiplier: number;
    protected sprintMultiplier: number;

    // Advanced movement properties
    protected velocity: Vector3 = new Vector3();
    protected lastPosition: Vector3;
    //#endregion

    //#region mind
    protected currentDestination?: Vector3;
    protected currentGoing?: Going;
    protected currentWaypoint?: PathWaypoint;
    //#endregion

    constructor(config: CConfig, place: Place) {
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

        // Main update loop - Use connections array to properly track and clean up
        const renderSteppedConnection = RunService.RenderStepped.Connect(dt => {
            this.updateMovementPhysics(dt);
            this.stateUpdater();
            this.stateChangeTracker();
            this.accelerationTracker(dt);
            this.thoughtProcessTracker();
        });

        this.connections.push(() => renderSteppedConnection.Disconnect());
    }

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
            warn(`[C: ${this.model.Name}] Invalid position detected: ${currentPosition}`);
            // Reset to last known good position if we have one
            if (this.isValidPosition(this.lastPosition)) {
                this.resetToPosition(this.lastPosition);
            }
            return;
        }

        // Calculate horizontal velocity with position change limit to prevent extreme values
        const maxPositionDelta = 10; // Maximum reasonable position change per frame
        const horizontalDelta = new Vector3(
            math.clamp(currentPosition.X - this.lastPosition.X, -maxPositionDelta, maxPositionDelta),
            0,
            math.clamp(currentPosition.Z - this.lastPosition.Z, -maxPositionDelta, maxPositionDelta)
        );

        // Update velocity based on position change with safety check
        this.velocity = horizontalDelta.div(dt);

        // Store last position
        this.lastPosition = currentPosition;

        // Update facing direction with smooth turning
        if (this.walkingDirection.Magnitude > 0) {
            this.targetFacingDirection = this.walkingDirection.Unit;
        }

        // Smooth turning with safety check
        const turnSpeed = this.movementConfig.turnSpeed;

        // Make sure facingDirection is valid
        if (!this.isValidVector(this.facingDirection)) {
            this.facingDirection = new Vector3(0, 0, -1);
        }

        // Make sure targetFacingDirection is valid
        if (!this.isValidVector(this.targetFacingDirection)) {
            this.targetFacingDirection = new Vector3(0, 0, -1);
        }

        // Safe interpolation between vectors
        this.facingDirection = this.safeLerp(
            this.facingDirection,
            this.targetFacingDirection,
            math.min(1, dt * turnSpeed)
        );

        // Only adjust orientation if we're actually moving
        if (this.walkingDirection.Magnitude > 0 && this.humanoid.MoveDirection.Magnitude > 0) {
            const rootPart = this.model.PrimaryPart;
            if (rootPart) {
                // Create a safe look vector that preserves Y position
                const currentPos = rootPart.Position;
                const facingVector = new Vector3(this.facingDirection.X, 0, this.facingDirection.Z).Unit;
                const targetPos = currentPos.add(facingVector);

                if (!this.isValidPosition(targetPos)) {
                    return;
                }

                // Create a lookAt CFrame but only use it for direction
                const lookCFrame = CFrame.lookAt(currentPos, targetPos);

                // IMPORTANT: Only rotate the model, DO NOT change its position
                rootPart.CFrame = new CFrame(
                    currentPos, // Keep current position exactly as is
                    lookCFrame.LookVector.add(currentPos) // Only use the orientation
                );
            }
        }
    }

    // Helper method to check if a position is valid (not NaN, infinite, or extreme)
    private isValidPosition(position: Vector3): boolean {
        // Check for NaN or infinite values
        if (
            !position ||
            !typeIs(position.X, "number") ||
            !typeIs(position.Y, "number") ||
            !typeIs(position.Z, "number") ||
            math.abs(position.X) > 1e6 ||
            math.abs(position.Y) > 1e6 ||
            math.abs(position.Z) > 1e6
        ) {
            return false;
        }
        return true;
    }

    // Helper method to check if a vector is valid
    private isValidVector(vector: Vector3): boolean {
        // Check for NaN, infinite, or zero magnitude
        if (
            !vector ||
            !typeIs(vector.X, "number") ||
            !typeIs(vector.Y, "number") ||
            !typeIs(vector.Z, "number") ||
            math.abs(vector.X) > 1e6 ||
            math.abs(vector.Y) > 1e6 ||
            math.abs(vector.Z) > 1e6
        ) {
            return false;
        }
        return true;
    }

    // Safely interpolate between vectors
    private safeLerp(v1: Vector3, v2: Vector3, alpha: number): Vector3 {
        // First ensure both vectors are valid
        if (!this.isValidVector(v1) || !this.isValidVector(v2)) {
            return new Vector3(0, 0, -1);
        }

        // Calculate angle between vectors
        const dot = v1.Dot(v2);
        const angleFactor = 1 - math.abs(dot); // 0 when vectors aligned, 1 when opposite

        // Adjust alpha based on angle - turn faster for bigger turns
        const dynamicAlpha = math.clamp(alpha * (1 + angleFactor * 2), 0, 1);

        // Use the dynamic alpha for interpolation
        let result = v1.Lerp(v2, dynamicAlpha);

        // Make sure result is valid
        if (!this.isValidVector(result)) {
            return new Vector3(0, 0, -1);
        }

        // Ensure we return a unit vector
        if (result.Magnitude < 0.001) {
            return new Vector3(0, 0, -1);
        } else {
            return result.Unit;
        }
    }

    // Reset character to a known good position
    private resetToPosition(position: Vector3): void {
        if (!this.model || !this.model.PrimaryPart) {
            return;
        }

        // Safely teleport the character back to the valid position
        this.model.PrimaryPart.CFrame = new CFrame(position);
        this.velocity = new Vector3();
        this.acc(0);
        this.humanoid.WalkSpeed = 0;

        warn(`[C: ${this.model.Name}] Reset character to position: ${position}`);
    }

    public speak(message: string) {
        if (!this.speechBubble || !this.speechBubbleTextBox || !this.model) {
            warn(`[C: ${this.id}] Cannot speak - speech bubble components not initialized`);
            return;
        }

        const speechBubble = this.speechBubble;
        speechBubble.Transparency = 0;
        speechBubble.Parent = this.model;

        if (!this.model.PrimaryPart) {
            warn(`[C: ${this.id}] Cannot position speech bubble - model has no PrimaryPart`);
            return;
        }

        speechBubble.CFrame = this.model.PrimaryPart.CFrame.add(new Vector3(0, 7, 0));
        this.speechBubbleTextBox.Text = message;

        setTimeout(() => {
            TweenService.Create(speechBubble, new TweenInfo(1), { Transparency: 1 }).Play();
        }, message.size() * 0.2);
    }

    protected setNametag(mes: string) {
        const textbox = this.nameTagLabel;
        if (textbox) {
            textbox.Text = mes;
        }
    }

    private spawn(config: CConfig) {
        try {
            const template = ReplicatedStorage.WaitForChild('Models')
                .WaitForChild("NPCs")
                .WaitForChild(this.id) as Model;
            assert(template.IsA('Model'), `Model '${this.id}' not found`);
            this.model = template.Clone();
            this.model.Parent = this.associatedPlace.getModel();
            this.model.Name = config.displayName;
            this.model.PrimaryPart!.CFrame = new CFrame(config.spawnLocation);
            this.nameTag = this.model.FindFirstChild('nametag')?.FindFirstChildOfClass('BillboardGui') as BillboardGui;
            this.nameTagLabel = this.nameTag?.FindFirstChildOfClass('TextBox') as TextBox;
        } catch (e) {
            warn(`[C: ${this.id}] Failed to spawn: ${e}`);
        }
    }

    public getPosition(): Vector3 {
        if (!this.model || !this.model.PrimaryPart) {
            return new Vector3();
        }

        const position = this.model.PrimaryPart.Position;

        // Validate position before returning
        if (this.isValidPosition(position)) {
            return position;
        } else {
            warn(`[C: ${this.model.Name}] Retrieved invalid position: ${position}`);
            return new Vector3();
        }
    }

    private waypointArriveTimeout?: ReturnType<typeof setTimeout>;
    private handleWaypoint(waypoint: PathWaypoint): boolean {
        // begin timeout
        this.waypointArriveTimeout = this.waypointArriveTimeout ?? setTimeout(() => {
            warn(`[C: ${this.model.Name}] [Going] Timeout at waypoint ${waypoint.Position}`);
            this.currentGoing?.destroy();
            this.currentGoing = undefined;
            this.currentWaypoint = undefined;
        }, 1)

        const currentPos = this.getPosition().mul(new Vector3(1, 0, 1));
        const waypointPos = waypoint.Position.mul(new Vector3(1, 0, 1));

        // look at the difference
        const diff = waypointPos.sub(currentPos);
        const threshold = 1;

        // if the difference is less than the threshold, then we reached the waypoint
        if (diff.Magnitude <= threshold) {
            this.currentWaypoint = undefined
            this.waypointArriveTimeout?.();
            this.waypointArriveTimeout = undefined
            return false;
        }

        // otherwise, move to the waypoint
        this.startMoving(diff);
        return true;
    }

    protected handleDestination() {
        if (!this.currentDestination) return;

        // want to go somewhere, but not going yet
        if (!this.currentGoing) {
            try {
                this.currentGoing = new Going({
                    destination: this.currentDestination,
                    characterModel: this.model,
                });
            } catch (e) {
                warn(`[C: ${this.model.Name}] Failed to initialize Going: ${e}`);
                this.currentDestination = undefined;
                return;
            }
            return;
        }

        // going somewhere, still thinking the path
        if (this.currentGoing.calculatingPath) {
            return;
        }

        // not calculating, and is not calculated, so calculate
        if (this.currentGoing.isCalculated === false) {
            try {
                this.currentGoing.calculatePath();
            } catch (e) {
                warn(`[C: ${this.model.Name}] Failed to calculate path: ${e}`);
                this.currentGoing.destroy();
                this.currentGoing = undefined;
                this.currentDestination = undefined;
            }
            return;
        }

        // get the waypoint
        this.currentWaypoint = this.currentWaypoint ?? this.currentGoing.nextWaypoint();
        if (!this.currentWaypoint) {
            this.currentGoing.destroy();
            this.currentGoing = undefined;
            return;
        }

        this.handleWaypoint(this.currentWaypoint);
    }

    protected thoughtProcessTracker() {
        this.handleDestination();
    }

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

        // More reactive acceleration/deceleration
        if (currentSpeed < topSpeed) {
            // Apply acceleration with a smooth curve for natural feel
            const accelerationFactor = 1 - (currentSpeed / topSpeed);
            const boostFactor = accelerationFactor * accelerationFactor; // Quadratic curve for initial boost

            this.acc(math.min(
                currentAcceleration + dt * accelerationSpeed * (1 + boostFactor),
                this.maxAcc
            ));
        }
        else if (currentSpeed > topSpeed) {
            // Calculate deceleration
            const randomDeceleration = (dt * accelerationSpeed * (0.8 + math.random() * 0.4));

            if (intendOnMoving) {
                // Gentle deceleration when still moving
                this.acc(math.max(currentAcceleration - randomDeceleration, -0.1));
            }
            else {
                // Stronger deceleration when stopping
                this.acc(
                    currentAcceleration - randomDeceleration * this.decelerateMultiplier
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

        // Update nametag with debug info if present
        this.setNametag(
            `Speed: ${string.format("%.3f", humanoid.WalkSpeed)}/${string.format("%.1f", topSpeed)}` +
            `\nAcc: ${string.format("%.3f", this.acc())}` +
            `\nVel: ${string.format("%.3f", this.velocity.Magnitude)}`
        );
    }

    protected startMoving(direction: Vector3) {
        if (!direction || direction.Magnitude === 0) {
            warn(`[C: ${this.model.Name}] Attempted to move with invalid direction`);
            return;
        }

        // Make sure direction is valid
        if (!this.isValidVector(direction)) {
            warn(`[C: ${this.model.Name}] Invalid movement direction: ${direction}`);
            return;
        }

        const dir = direction.Unit;
        this.walkingDirection = dir;
        this.targetFacingDirection = dir;

        if (this.humanoid) {
            this.humanoid.Move(dir);
        } else {
            warn(`[C: ${this.model.Name}] Cannot move - no humanoid found`);
        }
    }

    protected stopMoving() {
        this.walkingDirection = new Vector3();
        if (this.humanoid) {
            this.humanoid.Move(new Vector3());
        }
    }

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

    public getModel() {
        return this.model;
    }

    /**
     * Sets a destination for the character to move to
     * @param destination The Vector3 position to move to
     * @returns True if destination was set, false otherwise
     */
    public setDestination(destination: Vector3): boolean {
        if (!destination) return false;

        this.currentDestination = destination;
        return true;
    }

    /**
     * Toggles sprint/hurry mode
     * @param hurrying Whether the character should hurry
     */
    public setHurrying(hurrying: boolean): void {
        this.hurrying = hurrying;
    }
}