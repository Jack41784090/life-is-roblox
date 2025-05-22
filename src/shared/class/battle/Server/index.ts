import { RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import { AccessToken, ActionType, ActionValidator, BattleAction, BattleConfig, MoveAction, NeoClashResult, ResolveAttacksAction } from "shared/class/battle/types";
import { IDGenerator } from "shared/class/IDGenerator";
import { MOVEMENT_COST } from "shared/const";
import { extractMapValues, get2DManhattanDistance } from "shared/utils";
import Logger from 'shared/utils/Logger';
import { GameEvent } from "../Events/EventBus";
import { NetworkService } from "../Network";
import { SyncSystem } from "../Network/SyncSystem";
import { attackActionRefVerification } from "../Network/SyncSystem/veri";
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
        this.setUpEventListeners();
        this.state.StartLoop();
    }

    private setUpEventListeners() {
        const eventBus = this.state.getEventBus();
        eventBus.subscribe(GameEvent.TURN_STARTED, (playerID: unknown) => {
            const ver = t.number(playerID);
            if (!ver) {
                this.logger.error(`[${GameEvent.TURN_STARTED}] Invalid playerID: ${playerID}`);
                return;
            }
            this.syncSystem.broadcast('turnStart');
            this.logger.info(`[${GameEvent.TURN_STARTED}] Player ${playerID} turn started.`);
            this.waitForResponse().then(p => {
                if (p) {
                    this.logger.info(`[${GameEvent.TURN_STARTED}] Player ${p.Name} ended the turn.`);
                }
                else {
                    this.logger.warn(`[${GameEvent.TURN_STARTED}] No player ended the turn.`);
                }
                eventBus.emit(GameEvent.TURN_ENDED, playerID);
                this.syncSystem.broadcast('turnEnd', p?.UserId ?? -4178);
            })
        })
    }

    private setUpRemotes() {
        this.networkService.onServerRequestOf('state', (p) => {
            this.logger.debug(`Received state request from ${p.Name}`);
            return this.state.getState();
        })
        this.networkService.onServerRequestOf('cre', (p) => {
            this.logger.debug(`Received CRE request from ${p.Name}`);
            return this.state.getCurrentActorID();
        })
        this.networkService.onServerRequestOf('clashes', (p, accessToken) => {
            const attackAction = accessToken.action;
            const veri = attackActionRefVerification(attackAction);
            if (!veri) {
                this.logger.error(`Invalid attack action reference:`, attackAction);
                return [];
            }
            const veriToken = accessToken.token && this.givenTokens.some(t => t === accessToken.token);
            if (!veriToken) {
                this.logger.error(`Invalid token for attack action: ${accessToken.token}`);
                return [];
            }
            const clashes =
                this.validedClashes.get(accessToken.token) ??
                this.validedClashes.set(accessToken.token, this.state.getCombatSystem().resolveAttack(attackAction)).get(accessToken.token)!;

            return clashes;
        });
        this.networkService.onServerRequestOf('actor', (p, id) => {
            this.logger.debug(`Received actor request from ${p.Name}`);
            return this.state.getEntity(id)?.state();
        })
    }

    //#region Server-Side Loop
    //#region Validations
    private givenTokens: string[] = [];
    private validedClashes: Map<string, NeoClashResult[]> = new Map();

    private validateBaseActionInfo({ declaredAccess, client, winningClient }: ActionValidator): boolean {
        const { token, action, allowed } = declaredAccess;

        if (!this.state.getAllPlayers().find((p: Player) => p.UserId === client.UserId)) {
            this.logger.error(`Validation failed: Player ${client.Name} (${client.UserId}) not found in battle.`);
            return false;
        }
        if (!allowed) {
            this.logger.error(`Validation failed: Action explicitly not allowed for player ${client.Name}.`);
            return false;
        }
        if (!this.givenTokens.some(t => t === token)) {
            this.logger.error(`Validation failed: Invalid access code provided by ${client.Name}. Got: ${token}`);
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

    private async waitForResponse(): Promise<Player | undefined> {
        const network = this.networkService;
        const serverSideAccessCode = IDGenerator.generateID();
        const winningClient = this.state.getCurrentActorPlayer(); assert(winningClient, "No winning client found");

        this.logger.info(`Waiting for response from current turn player: ${winningClient.Name} (Access Code: ${serverSideAccessCode})`);

        return await new Promise<Player | undefined>((resolve) => {
            // Player requests to act, server responds with token if valid
            network.onServerRequestOf('toAct', requestingPlayer =>
                this.handleActRequest(requestingPlayer, serverSideAccessCode)
            );

            // Player acts, server validates and executes
            network.onServerRequestOf('act', (actingPlayer, access) =>
                this.handleActionExecution(
                    actingPlayer,
                    access as AccessToken,
                    serverSideAccessCode,
                    (playerWhoTookAction) => {
                        this.logger.info(`Action execution for ${actingPlayer.Name} completed.`);
                        turnEndPromiseResolve?.(playerWhoTookAction!);
                    }
                )
            );

            // Player requests to end turn, server validates and executes
            let turnEndPromiseResolve: ((p: Player) => void) | undefined = undefined;
            let endConnection: (() => void) | undefined = undefined;
            const turnEndPromise = new Promise<Player>((resolve) => {
                turnEndPromiseResolve = resolve;
                endConnection = network.onServerRemote('end', (player, state) => {
                    const okay = this.handleTurnEndRequest(
                        player,
                        state as AccessToken,
                    )
                    if (okay) {
                        this.logger.info(`Turn end request from ${player.Name} accepted.`);
                        resolve(player);
                    } else {
                        this.logger.warn(`Turn end request from ${player.Name} denied.`);
                    }
                });
            });

            turnEndPromise.then((playerWhoEndedTurn) => {
                endConnection?.(); // Disconnect the event listener
                this.logger.info(`Explicit turn end by ${playerWhoEndedTurn.Name} processed successfully.`);
                resolve(playerWhoEndedTurn);
            }).catch((err) => {
                this.logger.warn(`Error or validation failure in explicit onTurnEnd processing: ${err}.`);
            });
        }).then((p) => {
            if (p) {
                this.logger.info(`waitForResponse for ${winningClient.Name} concluded. Player ${p.Name} determined the turn's end.`);
            } else {
                this.logger.warn(`waitForResponse for ${winningClient.Name} concluded, but no specific player action directly led to it.`);
            }
            return p;
        });
    }

    private handleTurnEndRequest(
        requestingPlayer: Player,
        declaredClientAccess: AccessToken,
    ): boolean {
        const eventBus = this.state.getEventBus();
        const winningClient = this.state.getCurrentActorPlayer(); assert(winningClient, "No winning client found");
        const validationProps: ActionValidator = { client: requestingPlayer, declaredAccess: declaredClientAccess, winningClient };
        if (!this.validateEndTurnRequest(validationProps)) {
            this.logger.warn(`Explicit turn end request validation failed for ${requestingPlayer.Name}.`);
            return false;
        }

        this.logger.info(`Explicit turn end request validated and accepted for ${requestingPlayer.Name}.`);
        const entity = this.state.getEntity(requestingPlayer.UserId);
        if (entity) {
            eventBus.emit(GameEvent.TURN_ENDED, entity.playerID);
        } else {
            this.logger.warn(`Could not find entity for player ${requestingPlayer.Name} during their explicit turn end request.`);
        }
        return true;
    }

    private handleActRequest(
        requestingPlayer: Player,
        accessCode: string
    ): { userId: number; allowed: boolean; token: string | undefined } {
        const winningClient = this.state.getCurrentActorPlayer(); assert(winningClient, "No winning client found");
        if (!this.validateActionRequest({ winningClient, requestClient: requestingPlayer })) {
            this.logger.warn(`Action request from ${requestingPlayer.Name} denied (not their turn).`);
            return { userId: requestingPlayer.UserId, allowed: false, token: undefined };
        }
        this.givenTokens.push(accessCode);
        this.logger.debug(`Action request from ${requestingPlayer.Name} validated, access token provided.`);
        return { userId: requestingPlayer.UserId, allowed: true, token: accessCode };
    }

    private handleActionExecution(
        actingPlayer: Player,
        access: AccessToken,
        accessCode: string,
        resolveTurnPromise: (playerWhoTookAction: Player | undefined) => void
    ): { userId: number; allowed: boolean; token: string; action: BattleAction | undefined } {
        this.logger.info(`Received action execution from ${actingPlayer.Name}.`, access);

        // validate action
        const winningClient = this.state.getCurrentActorPlayer(); assert(winningClient, "No winning client found");
        const eventBus = this.state.getEventBus();
        const validationProps: ActionValidator = { client: actingPlayer, declaredAccess: access, winningClient };
        if (!this.validateFullAction(validationProps)) {
            this.logger.warn(`Action execution validation failed for ${actingPlayer.Name}.`);
            return { userId: actingPlayer.UserId, allowed: false, token: accessCode, action: access.action };
        }

        // commit
        this.logger.info(`Committing action for ${actingPlayer.Name}: ${access.action!.type}`);
        // special check for resolveAttacks action
        if (access.action?.type === ActionType.ResolveAttacks) {
            const resolveAttacksAction = access.action as ResolveAttacksAction;
            const clashes = this.validedClashes.get(access.token!);
            if (clashes) {
                this.logger.debug(`Clashes for ${actingPlayer.Name}:`, clashes);
                resolveAttacksAction.results = clashes;
            } else {
                this.logger.error(`No clashes found for ${actingPlayer.Name} with token ${access.token}.`);
            }
        }
        this.state.commit(access.action!);

        // animate for clients
        // this.syncSystem.broadcast('')
        this.syncSystem.broadcast('animate', access);

        // posture check to see if turn will end
        const currentActor = this.state.getCurrentActor();
        const posture = currentActor.get('pos');
        this.logger.debug(`Posture for ${actingPlayer.Name} after action: ${posture}.`);
        if (posture < BattleServer.MIN_POSTURE_TO_CONTINUE_TURN) {
            this.logger.info(`Turn ended for ${actingPlayer.Name}: Posture (${posture}) fell below ${BattleServer.MIN_POSTURE_TO_CONTINUE_TURN}.`);
            eventBus.emit(GameEvent.TURN_ENDED, currentActor.playerID);
            resolveTurnPromise(actingPlayer);
        }

        return { userId: actingPlayer.UserId, allowed: true, token: accessCode, action: access.action };
    }
    //#endregion
}

