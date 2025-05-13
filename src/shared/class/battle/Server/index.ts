import { RunService } from "@rbxts/services";
import { ActionType, ActionValidator, BattleConfig, MoveAction } from "shared/class/battle/types";
import { MOVEMENT_COST } from "shared/const";
import { extractMapValues, get2DManhattanDistance } from "shared/utils";
import Logger from 'shared/utils/Logger';
import { NetworkService } from "../Network";
import { SyncSystem } from "../Network/SyncSystem";
import State from "../State";

export default class BattleServer {
    public static Create(config: Partial<BattleConfig>) {
        if (RunService.IsServer()) {
            return new BattleServer(config);
        }
        else {
            Logger.error("Battle.Create can only be called on the server");
            return undefined;
        }
    }

    private static readonly MIN_POSTURE_TO_CONTINUE_TURN = 75;
    private logger = Logger.createContextLogger("Battle");
    private state: State;
    private networkService: NetworkService;
    private syncSystem: SyncSystem;

    private constructor(config: Partial<BattleConfig>) {
        this.logger.info(`Creation of Battle with config:`, config);
        assert(config.teamMap, "No team map provided");
        this.state = new State({
            width: config.width ?? 10,
            worldCenter: config.worldCenter ?? new Vector3(),
            teamMap: config.teamMap!,
        });

        this.networkService = new NetworkService();

        const players: Player[] = [];
        const _players = extractMapValues(config.teamMap!);
        _players.forEach(p => {
            p.forEach(_p => players.push(_p));
        })
        this.syncSystem = new SyncSystem({ players });
        this.setUpRemotes();
        this.state.StartLoop();
    }

    private setUpRemotes() {
        this.networkService.onServerRequestOf('state', (p) => {
            this.logger.debug(`Received state request from ${p.Name}`);
            return this.state.getState();
        })
    }

    //#region Validations
    private validateBaseActionInfo({ declaredAccess, client, trueAccessCode, winningClient }: ActionValidator): boolean {
        const { token, action, allowed } = declaredAccess;

        if (!this.state.getAllPlayers().find((p: Player) => p.UserId === client.UserId)) {
            this.logger.error(`Validation failed: Player ${client.Name} (${client.UserId}) not found in battle.`);
            return false;
        }
        if (!allowed) {
            this.logger.error(`Validation failed: Action explicitly not allowed for player ${client.Name}.`);
            return false;
        }
        if (token !== trueAccessCode) {
            this.logger.error(`Validation failed: Invalid access code provided by ${client.Name}. Expected: ${trueAccessCode}, Got: ${token}`);
            return false;
        }
        if (!action) {
            this.logger.error(`Validation failed: No action chosen/provided by ${client.Name}.`);
            return false;
        }
        if (client.UserId !== winningClient.UserId) {
            this.logger.error(`Validation failed: Player ${client.Name} attempted to act, but it is ${winningClient.Name}'s turn.`);
            return false;
        }
        return true;
    }

    private validateActionRequest({ winningClient, requestClient }: {
        winningClient: Player,
        requestClient: Player,
    }): boolean {
        if (winningClient.UserId !== requestClient.UserId) {
            this.logger.warn(`Action request validation failed: Player ${requestClient.Name} attempted to request action, but it is ${winningClient.Name}'s turn.`);
            return false;
        }
        return true;
    }

    private validateEndTurnRequest(validatorProps: ActionValidator): boolean {
        return this.validateBaseActionInfo(validatorProps);
    }

    private checkMovementPossibility(action: MoveAction, entityPerformingMovement: Player): boolean {
        const { from, to } = action;
        const fromCell = this.state.getCell(from);
        const toCell = this.state.getCell(to);

        if (!fromCell) {
            this.logger.error(`Movement validation failed for ${entityPerformingMovement.Name}: No cell found at source position ${from}.`);
            return false;
        }
        if (!toCell) {
            this.logger.error(`Movement validation failed for ${entityPerformingMovement.Name}: No cell found at target position ${to}.`);
            return false;
        }
        const fromEntityID = fromCell.entity;
        const toEntityID = toCell.entity;
        if (!fromEntityID) {
            this.logger.error(`Movement validation failed for ${entityPerformingMovement.Name}: No entity found in source cell at ${from}.`);
            return false;
        }
        if (toEntityID) {
            this.logger.error(`Movement validation failed for ${entityPerformingMovement.Name}: Target cell at ${to} is already occupied.`);
            return false;
        }
        const fromEntityState = this.state.getEntity(fromEntityID);
        if (!fromEntityState) {
            this.logger.error(`Movement validation failed for ${entityPerformingMovement.Name}: Invalid entity ID ${fromEntityID} in state.`);
            return false;
        }
        if (fromEntityState.playerID !== entityPerformingMovement.UserId) {
            this.logger.error(`Movement validation failed: Entity in cell ${from} (${fromEntityState.playerID}) does not match acting player ${entityPerformingMovement.Name} (${entityPerformingMovement.UserId}).`);
            return false;
        }

        const costOfMovement = MOVEMENT_COST * get2DManhattanDistance(from, to);
        const currentPosture = fromEntityState.get('pos');
        if (currentPosture < costOfMovement) {
            this.logger.warn(`Movement validation failed for ${entityPerformingMovement.Name}: Insufficient posture (${currentPosture}) for movement (cost: ${costOfMovement}).`);
            return false;
        }
        this.logger.debug(`Movement validation successful: ${entityPerformingMovement.Name} can move from ${from} to ${to}.`);
        return true;
    }

    private validateFullAction(validatorProps: ActionValidator): boolean {
        if (!this.validateBaseActionInfo(validatorProps)) {
            return false;
        }
        const { action } = validatorProps.declaredAccess;
        const actingPlayer = validatorProps.client;

        if (action?.type === ActionType.Move) {
            if (!this.checkMovementPossibility(action as MoveAction, actingPlayer)) {
                return false;
            }
        }
        if (action?.type === ActionType.Attack) {
            this.logger.debug(`Attack action validation for ${actingPlayer.Name}.`);
        }

        return true;
    }
    //#endregion

    // private syncPlayerUIUpdatesOnTurnStart() {
    //     const currentActorID = this.turnSystem.getCurrentActorID();
    //     if (!currentActorID) {
    //         this.logger.warn("No current actor ID found when syncing player UIs for turn start.");
    //         return;
    //     }
    //     const currentEntity = this.state.getEntity(currentActorID);
    //     if (!currentEntity) {
    //         this.logger.warn(`Current entity not found for ID: ${currentActorID} when syncing player UIs for turn start.`);
    //         return;
    //     }
    //     this.state.getEventBus().emit(GameEvent.TURN_STARTED, currentEntity);
    //     this.logger.debug(`EventBus notified: TURN_STARTED for entity ID: ${currentActorID}.`);
    // }

    // private _handleActRequest(
    //     requestingPlayer: Player,
    //     winningClient: Player,
    //     accessCode: string
    // ): { userId: number; allowed: boolean; token: string | undefined } {
    //     if (!this.validateActionRequest({ winningClient, requestClient: requestingPlayer })) {
    //         this.logger.warn(`Action request from ${requestingPlayer.Name} denied (not their turn).`);
    //         return { userId: requestingPlayer.UserId, allowed: false, token: undefined };
    //     }
    //     this.logger.debug(`Action request from ${requestingPlayer.Name} validated, access token provided.`);
    //     return { userId: requestingPlayer.UserId, allowed: true, token: accessCode };
    // }

    // private _handleActionExecution(
    //     actingPlayer: Player,
    //     access: AccessToken,
    //     winningClient: Player,
    //     accessCode: string,
    //     eventBus: EventBus,
    //     resolveTurnPromise: (playerWhoTookAction: Player | undefined) => void
    // ): { userId: number; allowed: boolean; token: string; action: BattleAction | undefined } {
    //     this.logger.info(`Received action execution from ${actingPlayer.Name}. Action: ${access.action?.type}`);

    //     const validationProps: ActionValidator = { client: actingPlayer, declaredAccess: access, trueAccessCode: accessCode, winningClient };
    //     if (!this.validateFullAction(validationProps)) {
    //         this.logger.warn(`Action execution validation failed for ${actingPlayer.Name}.`);
    //         return { userId: actingPlayer.UserId, allowed: false, token: accessCode, action: access.action };
    //     }

    //     this.logger.info(`Committing action for ${actingPlayer.Name}: ${access.action!.type}`);
    //     this.state.commit(access.action!);

    //     // this.syncSystem.syncClientState(actingPlayer);
    //     this.syncSystem.broadcast('forceUpdate', actingPlayer);

    //     const cre = this.state.getEntity(actingPlayer.UserId);
    //     if (!cre) {
    //         this.logger.error(`CRITICAL: CRE not found for ${actingPlayer.Name} (${actingPlayer.UserId}) immediately after action commit.`);
    //         return { userId: actingPlayer.UserId, allowed: false, token: accessCode, action: access.action };
    //     }

    //     if (cre.playerID !== this.turnSystem.getCurrentActorID()) {
    //         this.logger.error(`CRITICAL: Turn actor mismatch. Current actor: ${this.turnSystem.getCurrentActorID()}, Action by: ${cre.playerID} (${actingPlayer.Name}).`);
    //         return { userId: actingPlayer.UserId, allowed: false, token: accessCode, action: access.action };
    //     }

    //     const posture = cre.get('pos');
    //     this.logger.debug(`Posture for ${actingPlayer.Name} after action: ${posture}.`);

    //     if (posture < BattleServer.MIN_POSTURE_TO_CONTINUE_TURN) {
    //         this.logger.info(`Turn ended for ${actingPlayer.Name}: Posture (${posture}) fell below ${BattleServer.MIN_POSTURE_TO_CONTINUE_TURN}.`);
    //         eventBus.emit(GameEvent.TURN_ENDED, cre);
    //         resolveTurnPromise(actingPlayer);
    //     }

    //     return { userId: actingPlayer.UserId, allowed: true, token: accessCode, action: access.action };
    // }

    // private _handleTurnEndRequest(
    //     requestingPlayer: Player,
    //     declaredClientAccess: AccessToken,
    //     winningClient: Player,
    //     trueServerAccessCode: string,
    //     eventBus: EventBus
    // ): boolean {
    //     const validationProps: ActionValidator = { client: requestingPlayer, declaredAccess: declaredClientAccess, trueAccessCode: trueServerAccessCode, winningClient };
    //     if (!this.validateEndTurnRequest(validationProps)) {
    //         this.logger.warn(`Explicit turn end request validation failed for ${requestingPlayer.Name}.`);
    //         return false;
    //     }

    //     this.logger.info(`Explicit turn end request validated and accepted for ${requestingPlayer.Name}.`);
    //     const entity = this.state.getEntity(requestingPlayer.UserId);
    //     if (entity) {
    //         eventBus.emit(GameEvent.TURN_ENDED, entity);
    //     } else {
    //         this.logger.warn(`Could not find entity for player ${requestingPlayer.Name} during their explicit turn end request.`);
    //     }
    //     return true;
    // }

    // private async waitForResponse(winningClient: Player): Promise<Player | undefined> {
    //     const network = this.networkService;
    //     const accessCode = IDGenerator.generateID();
    //     const eventBus = this.state.getEventBus();

    //     this.logger.info(`Waiting for response from current turn player: ${winningClient.Name} (Access Code: ${accessCode})`);


    //     // Create a new Promise that explicitly returns Player | undefined
    //     return await new Promise<Player | undefined>((resolve) => {
    //         network.onServerRequestOf('toAct', requestingPlayer =>
    //             this._handleActRequest(requestingPlayer, winningClient, accessCode)
    //         );
    //         network.onServerRequestOf('act', (actingPlayer, access) =>
    //             this._handleActionExecution(
    //                 actingPlayer,
    //                 access as AccessToken,
    //                 winningClient,
    //                 accessCode,
    //                 eventBus,
    //                 (player: Player | undefined) => resolve(player)
    //             )
    //         );
    //         let endConnection: (() => void) | undefined = undefined;
    //         const turnEndPromise = new Promise<Player>((resolve) => {
    //             endConnection = network.onServerRemote('end', (player, state) => {
    //                 const okay = this._handleTurnEndRequest(
    //                     player,
    //                     state as AccessToken,
    //                     winningClient,
    //                     accessCode,
    //                     eventBus
    //                 )
    //                 if (okay) {
    //                     this.logger.info(`Turn end request from ${player.Name} accepted.`);
    //                     resolve(player);
    //                 } else {
    //                     this.logger.warn(`Turn end request from ${player.Name} denied.`);
    //                 }
    //             });
    //         });

    //         turnEndPromise.then((playerWhoEndedTurn) => {
    //             endConnection?.(); // Disconnect the event listener
    //             this.logger.info(`Explicit turn end by ${playerWhoEndedTurn.Name} processed successfully.`);
    //             resolve(playerWhoEndedTurn);
    //         }).catch((err) => {
    //             this.logger.warn(`Error or validation failure in explicit onTurnEnd processing: ${err}.`);
    //         });
    //     }).then((p) => {
    //         if (p) {
    //             this.logger.info(`waitForResponse for ${winningClient.Name} concluded. Player ${p.Name} determined the turn's end.`);
    //         } else {
    //             this.logger.warn(`waitForResponse for ${winningClient.Name} concluded, but no specific player action directly led to it.`);
    //         }
    //         return p;
    //     });
    // }

    // private _isGameOver(): boolean {
    //     const teamManager = this.state.getTeamManager();
    //     const teams = teamManager.getAllTeams();
    //     let activeTeamsCount = 0;

    //     for (const team of teams) {
    //         const hasAliveMembers = team.members.some((member: Entity) => {
    //             return member.get('hip') > 0;
    //         });

    //         if (hasAliveMembers) {
    //             activeTeamsCount++;
    //         }
    //     }

    //     // if (activeTeamsCount <= 1) {
    //     //     this.logger.info(`Game over condition met: ${activeTeamsCount} team(s) have active units.`);
    //     //     return true;
    //     // }
    //     return false;
    // }

    // private _announceWinner(winningTeam?: Team) {
    //     if (winningTeam) {
    //         this.logger.info(`Team ${winningTeam.name} is victorious!`);
    //     } else {
    //         this.logger.info("The game is a draw or ended inconclusively.");
    //     }
    // }

    // private _handleGameOver() {
    //     this.logger.info("Game over sequence initiated.");
    //     const teamManager = this.state.getTeamManager();
    //     const teams = teamManager.getAllTeams();
    //     const activeTeams: Team[] = [];

    //     for (const team of teams) {
    //         const hasAliveMembers = team.members.some((member: Entity) => {
    //             return member.get('pos') > 0;
    //         });
    //         if (hasAliveMembers) {
    //             activeTeams.push(team);
    //         }
    //     }

    //     let winner: Team | undefined = undefined;
    //     if (activeTeams.size() === 1) {
    //         winner = activeTeams[0];
    //     }
    //     this._announceWinner(winner);
    // }

    // private async gameLoop() {
    //     while (!this._isGameOver()) {
    //         task.wait(0.1);

    //         // Get the next turn actor (now awaiting the Promise)
    //         const pnt = await this.turnSystem.progressToNextTurn();
    //         if (!pnt) {
    //             this.logger.warn("No next actor could be determined by TurnSystem.");
    //             if (!this._isGameOver()) {
    //                 this.logger.error("Battle loop cannot continue: No next actor, but game over conditions not met.");
    //             }
    //             break;
    //         }

    //         const [currentActor, actingEntity] = pnt;
    //         this.logger.info(`New turn starting for: ${currentActor.Name} (Entity: ${actingEntity.name})`);

    //         this.syncPlayerUIUpdatesOnTurnStart();

    //         const playerEndingTurn = await this.waitForResponse(currentActor);

    //         if (playerEndingTurn) {
    //             this.logger.info(`Turn action phase concluded by ${playerEndingTurn.Name}.`);
    //         } else {
    //             this.logger.warn(`Turn action phase for ${currentActor.Name} concluded without a specific player action.`);
    //         }
    //     }

    //     this.logger.info("Game loop finished.");
    //     this._handleGameOver();
    // }
}

