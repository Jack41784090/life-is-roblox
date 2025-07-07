import { atom, Atom } from "@rbxts/charm";
import Logger from "shared/utils/Logger";

export enum ActionLockType {
    ABILITY_SELECTION = "ability_selection",
    MOVEMENT = "movement",
    ATTACK = "attack",
    STYLE_SWITCH = "style_switch",
    GLOBAL = "global"
}

export interface ActionLockState {
    isLocked: boolean;
    lockType: ActionLockType;
    lockStartTime: number;
    lockDuration: number;
    lockReason?: string;
}

export class ActionLockService {
    private static instance: ActionLockService;
    private logger = Logger.createContextLogger("ActionLockService");

    private lockStates = new Map<ActionLockType, Atom<ActionLockState>>();
    private debounceTimers = new Map<ActionLockType, number>();

    private readonly DEFAULT_LOCK_DURATIONS = {
        [ActionLockType.ABILITY_SELECTION]: 0.3,
        [ActionLockType.MOVEMENT]: 0.5,
        [ActionLockType.ATTACK]: 0.8,
        [ActionLockType.STYLE_SWITCH]: 0.5,
        [ActionLockType.GLOBAL]: 1.0
    };

    private constructor() {
        this.initializeLockStates();
    }

    public static getInstance(): ActionLockService {
        if (!ActionLockService.instance) {
            ActionLockService.instance = new ActionLockService();
        }
        return ActionLockService.instance;
    }

    private initializeLockStates(): void {
        const lockTypes = [
            ActionLockType.ABILITY_SELECTION,
            ActionLockType.MOVEMENT,
            ActionLockType.ATTACK,
            ActionLockType.STYLE_SWITCH,
            ActionLockType.GLOBAL
        ];

        for (const lockType of lockTypes) {
            this.lockStates.set(lockType, atom<ActionLockState>({
                isLocked: false,
                lockType,
                lockStartTime: 0,
                lockDuration: 0
            }));
        }
    }

    public isLocked(lockType: ActionLockType): boolean {
        const lockState = this.lockStates.get(lockType);
        if (!lockState) return false;

        const state = lockState();
        if (!state.isLocked) return false;

        // Check if lock has expired
        const currentTime = tick();
        if (currentTime >= state.lockStartTime + state.lockDuration) {
            this.unlock(lockType);
            return false;
        }

        return true;
    }

    public isGloballyLocked(): boolean {
        return this.isLocked(ActionLockType.GLOBAL);
    }

    public lock(lockType: ActionLockType, duration?: number, reason?: string): void {
        if (this.isLocked(lockType)) {
            this.logger.debug(`Already locked: ${lockType}`);
            return;
        }

        const lockDuration = duration ?? this.DEFAULT_LOCK_DURATIONS[lockType];
        const lockState = this.lockStates.get(lockType);

        if (lockState) {
            lockState({
                isLocked: true,
                lockType,
                lockStartTime: tick(),
                lockDuration,
                lockReason: reason
            });

            this.logger.debug(`Locked ${lockType} for ${lockDuration}s`, reason);

            // Auto-unlock after duration using task.spawn for non-blocking behavior
            task.spawn(() => {
                task.wait(lockDuration);
                this.unlock(lockType);
            });
        }
    }

    public unlock(lockType: ActionLockType): void {
        const lockState = this.lockStates.get(lockType);
        if (lockState) {
            lockState(prev => ({
                ...prev,
                isLocked: false
            }));

            this.logger.debug(`Unlocked ${lockType}`);
        }
    }

    public unlockAll(): void {
        const lockTypes = [
            ActionLockType.ABILITY_SELECTION,
            ActionLockType.MOVEMENT,
            ActionLockType.ATTACK,
            ActionLockType.STYLE_SWITCH,
            ActionLockType.GLOBAL
        ];

        for (const lockType of lockTypes) {
            this.unlock(lockType);
        }
    }

    public getLockState(lockType: ActionLockType): Atom<ActionLockState> | undefined {
        return this.lockStates.get(lockType);
    }

    public canPerformAction(lockType: ActionLockType): boolean {
        return !this.isLocked(lockType) && !this.isGloballyLocked();
    }

    public withDebounce(lockType: ActionLockType, action: () => void, debounceTime: number = 0.1): void {
        const existingTimer = this.debounceTimers.get(lockType);
        if (existingTimer) {
            return; // Action is debounced
        }

        // Execute action immediately
        action();

        // Set debounce timer
        this.debounceTimers.set(lockType, tick());

        // Clear debounce after specified time using task.spawn
        task.spawn(() => {
            task.wait(debounceTime);
            this.debounceTimers.delete(lockType);
        });
    }

    public lockForAction(lockType: ActionLockType, action: () => Promise<void>, duration?: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.canPerformAction(lockType)) {
                reject(`Cannot perform action: ${lockType} is locked`);
                return;
            }

            this.lock(lockType, duration, "Action in progress");

            action()
                .then(() => {
                    this.unlock(lockType);
                    resolve();
                })
                .catch((err) => {
                    this.unlock(lockType);
                    reject(err);
                });
        });
    }
}
