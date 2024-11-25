import { RunService, UserInputService } from "@rbxts/services";
import { AttackAction, CharacterActionMenuAction, CharacterMenuAction, EntityStatus } from "shared/types/battle-types";
import { isAttackKills, warnWrongSideCall } from "shared/utils";
import Entity from "../Entity";
import { AnimationType } from "../Entity/AnimationHandler";
import HexGrid from "../Hex/Grid";
import BattleCam from "./BattleCamera";
import Gui from "./Gui";


export default class ClientSide {
    public grid: HexGrid;
    public gui: Gui;
    public camera: BattleCam;

    private constructor(worldCenter: Vector3, size: number, width: number, height: number, camera: Camera) {
        const halfWidth = (width * size) / 2;
        const halfHeight = (height * size) / 2;
        const gridMin = new Vector2(worldCenter.X - halfWidth, worldCenter.Z - halfHeight);
        const gridMax = new Vector2(worldCenter.X + halfWidth, worldCenter.Z + halfHeight);
        this.camera = new BattleCam(camera, worldCenter, gridMin, gridMax);
        this.gui = Gui.Connect(this.getReadinessIcons(), this.grid);
    }

    attackRemoteEventReceived?: RBXScriptConnection;
    escapeScript?: RBXScriptConnection;

    /**
     * Creates a new Battle instance with the provided configuration.
     * 
     * @param config - The configuration object for the battle.
     * @param config.camera - The camera to be used in the battle.
     * @param config.worldCenter - The center position of the world.
     * @param config.width - The width of the battle area.
     * @param config.height - The height of the battle area.
     * @param config.teamMap - A record mapping team names to arrays of players.
     * 
     * @returns A new instance of the Battle class.
     */
    public static async Create(config: {
        camera: Camera,
        worldCenter: Vector3,
        width: number;
        height: number;
        teamMap: Record<string, Player[]>;
    }) {
        if (RunService.IsServer()) {
            warnWrongSideCall("Create");
            return;
        }



        return new ClientSide(config.worldCenter, 4, config.width, config.height, config.camera);
    }
    /**
     * Initializes the grid by calling the materialise method on the grid object.
     * This method sets up the grid for further operations.
     */
    private initializeGrid() {
        this.grid.materialise();
    }
    /**
     * Initializes the camera by setting it to HOI4 mode.
     * This method configures the camera to enter a specific mode
     * defined by the `enterHOI4Mode` method of the `camera` object.
     */
    private initializeCamera() {
        this.camera.enterHOI4Mode();
    }

    private initializeGraphics() {
        this.initializeCamera();
        this.initializeGrid();
    }

    private initializeEntitiesCharacteristics() {
        const allEntities = this.getAllEntities();
        allEntities.forEach((e) => e.initialiseCharacteristics());
    }

    public getCharacterMenuActions(entity: Entity): CharacterMenuAction[] {
        return [
            {
                type: CharacterActionMenuAction.Move,
                run: (tree: ReactRoblox.Root) => {
                    tree.unmount();
                    this.camera.enterHOI4Mode(entity.cell?.worldPosition()).then(() => {
                        this.enterMovementMode();
                    });
                },
            },
            {
                type: CharacterActionMenuAction.EndTurn,
                run: (tree: ReactRoblox.Root) => {
                    tree.unmount();
                    // this.endTurn?.(void 0);
                },
            },
        ];
    }


    private setUpAttackRemoteEventReceiver() {
        if (RunService.IsServer()) {
            warnWrongSideCall("setUpAttackRemoteEventReceiver");
            return
        }
        this.attackRemoteEventReceived?.Disconnect();
        // this.attackRemoteEventReceived = remoteEvent_Attack.OnClientEvent.Connect((clashResult: ClashResult & { abilityState: AbilityState }) => {
        //     print("Attack clash result received", clashResult);

        //     const using = this.getAllEntities().find((e) => e.playerID === clashResult.abilityState.using);
        //     const target = this.getAllEntities().find((e) => e.playerID === clashResult.abilityState.target);

        //     if (!using || !target) {
        //         warn("Using or target entity not found", using, target);
        //         return;
        //     }
        //     const ability = new Ability({
        //         ...clashResult.abilityState,
        //         using,
        //         target,
        //     })
        //     this.applyClash({ executed: true, ability, clashResult });
        //     this.executeAttackSequence({ executed: true, ability, clashResult });
        // })
    }

    private async round() {
        const r = this.incrementTime();

        this.gui.clearAll()
        this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });

        // remoteEvent_Readiness.FireServer('ReadyForReadinessCheck');

        // remoteEvent_Readiness.OnClientEvent.Once(async w => {
        //     const winner = this.getAllEntities().find(e => e.playerID === w as number);
        //     this.currentRoundEntity = winner;
        //     print(`${Players.LocalPlayer.Name} has received winner: ${winner?.name}`);
        //     if (!this.currentRoundEntity) {
        //         warn("No entity found to start the next round");
        //         // await this.camera.enterHOI4Mode();
        //         // this.round();
        //         return;
        //     }

        //     await this.camera.enterCharacterCenterMode();

        //     await new Promise((resolve) => {
        //         const cre = this.currentRoundEntity
        //         //#region 
        //         if (!cre) {
        //             warn("No current round entity found");
        //             return;
        //         }
        //         //#endregion
        //         this.endTurn = () => {
        //             resolve(void 0);
        //             this.gui.clearAll();
        //         }

        //         this.setUpAttackRemoteEventReceiver();

        //         if (cre.playerID !== Players.LocalPlayer.UserId) {
        //             // other player turn...
        //             this.gui.mountOtherPlayersTurnGui();
        //             if (cre.playerID === -1) {
        //                 wait(2);
        //                 this.endTurn(void 0);
        //             }
        //         }
        //         else {
        //             this.gui.mountActionMenu(this.getCharacterMenuActions(cre));
        //         }
        //         cre.playAudio(EntityStatus.Idle);
        //     });

        //     this.finalizeRound(this.currentRoundEntity);
        //     this.round();
        // })
    }

    private incrementTime() {
        print(`Round ${this.time + 1} has begun!`);
        return ++this.time;
    }
    /**
     * Set up a script that listens for the escape key (X) to cancel the current action
     * @returns the script connection
     */
    private setUpCancelCurrentActionScript(): RBXScriptConnection {
        this.escapeScript?.Disconnect();
        this.escapeScript = UserInputService.InputBegan.Connect((i, gpe) => {
            if (i.KeyCode === Enum.KeyCode.X && !gpe) {
                this.returnToSelections();
            }
        })
        return this.escapeScript;
    }
    /**
     * Return to the selection screen after movement or canceling an action
     *  1. exitMovementUI() is called to reset the UI
     *  2. The camera is centered on the current entity
     *  3. going back to the action selection screen
     */
    private async returnToSelections() {
        this.exitMovementMode()
        await this.camera.enterCharacterCenterMode()
        if (this.currentRoundEntity) {
            this.gui.mountActionMenu(this.getCharacterMenuActions(this.currentRoundEntity));
        }
    }

    private finalizeRound(nextEntity: Entity) {
        // this.updateEntityStatsAfterRound(nextEntity);
        this.currentRoundEntity = undefined;
    }

    private async executeAttackSequence(attackAction: AttackAction) {
        //#region 
        this.exitMovementMode()
        await this.playAttackAnimation(attackAction);
        this.enterMovementMode();
    }
    /**
     * Enter movement mode
     * 
     * Movement mode: when cells glow along with the cursor to create a pathfinding effect.
     * 
     * Steps:
     * 
     * 1. Set up scripts:
     *    - Set up an escape script to cancel the current action.
     * 
     * 2. Rendering:
     *    - Re-render the UI to include sensitive cells.
     *    - Mount the ability slots for the current entity.
     */
    private enterMovementMode() {
        print("Entering movement mode");
        this.escapeScript = this.setUpCancelCurrentActionScript();
        const cre = this.currentRoundEntity;
        if (cre) {
            this.gui.mountAbilitySlots(cre);
            this.gui.updateMainUI('withSensitiveCells', {
                cre: cre!,
                grid: this.grid,
                readinessIcons: this.getReadinessIcons(),
            });
        }
    }

    private exitMovementMode() {
        this.escapeScript?.Disconnect();
        this.gui.clearAll();
        this.gui.updateMainUI('onlyReadinessBar', { readinessIcons: this.getReadinessIcons() });
    }

    private async playAttackAnimation(attackAction: AttackAction) {
        const { using: attacker, target, animation } = attackAction.ability;

        if (!attacker.model?.PrimaryPart || !target.model?.PrimaryPart) {
            warn("[playAttackAnimation] PrimaryPart not found for attacker or target.");
            return;
        }

        await target.faceEntity(attacker);

        const attackAnimation = attacker.playAnimation({
            animation,
            priority: Enum.AnimationPriority.Action4,
            loop: false,
        });

        const defendIdleAnimation = target.playAnimation({
            animation: "defend",
            priority: Enum.AnimationPriority.Action2,
            loop: false,
        });

        if (!attackAnimation) {
            warn("[playAttackAnimation] Attacker animation track not found.");
            return;
        }

        try {
            await this.waitForAnimationMarker(attackAnimation, "Hit");
            target.animationHandler?.killAnimation(AnimationType.Idle);

            if (isAttackKills(attackAction)) {
                defendIdleAnimation?.Stop();
                target.playAnimation({
                    animation: "death-idle",
                    priority: Enum.AnimationPriority.Idle,
                    loop: true,
                })
                const deathAnimation = target.playAnimation({
                    animation: "death",
                    priority: Enum.AnimationPriority.Action3,
                    loop: false,
                });
            }
            else {
                defendIdleAnimation?.Stop();
                const gotHitAnimation = target.playAnimation({
                    animation: "defend-hit",
                    priority: Enum.AnimationPriority.Action3,
                    loop: false,
                });

                await this.waitForAnimationEnd(attackAnimation);
                if (gotHitAnimation) await this.waitForAnimationEnd(gotHitAnimation);

                const transitionTrack = target.playAnimation({
                    animation: "defend->idle",
                    priority: Enum.AnimationPriority.Action4,
                    loop: false,
                });

                transitionTrack?.Ended.Wait();
                target.playAnimation({
                    animation: "idle",
                    priority: Enum.AnimationPriority.Idle,
                    loop: true,
                })
            }
        } catch (error) {
            warn(`[playAttackAnimation] Error during attack animation: ${error}`);
        }

        attacker.playAudio(EntityStatus.Idle);
    }
    /**
     * Waits for a specific marker in an animation track.
     * @param track The animation track to monitor.
     * @param markerName The name of the marker to wait for.
     */
    private waitForAnimationMarker(track: AnimationTrack, markerName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = track.GetMarkerReachedSignal(markerName).Once(() => {
                resolve();
            });

            wait(5);
            if (connection.Connected) {
                connection.Disconnect();
                reject();
            }
        });
    }
    /**
     * Waits for an animation track to end.
     * @param track The animation track to monitor.
     */
    private waitForAnimationEnd(track: AnimationTrack): Promise<void> {
        return new Promise((resolve) => {
            const connection = track.Ended.Connect(() => {
                connection.Disconnect();
                resolve();
            });
        });
    }
}