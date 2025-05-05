import { RunService } from "@rbxts/services";
import { MOVEMENT_COST } from "shared/const";
import { ActionType, ActionValidator, Config, MoveAction } from "shared/types/battle-types";
import { get2DManhattanDistance } from "shared/utils";
import Logger from 'shared/utils/Logger';
import { IDGenerator } from "../IDGenerator";
import { GameEvent } from "./Events/EventBus";
import { NetworkService } from "./Network/NetworkService";
import { SyncSystem } from "./Network/SyncSystem";
import { GameState } from "./State/GameState";
import { TurnSystem } from "./Systems/TurnSystem";

export default class Battle {
    public static Create(config: Partial<Config>) {
        if (RunService.IsServer()) {
            return new Battle(config);
        }
        else {
            Logger.error("Battle.Create can only be called on the server");
            return undefined;
        }
    }

    private logger = Logger.createContextLogger("Battle");
    private state: GameState;
    private networkService: NetworkService;
    private syncSystem: SyncSystem;
    private turnSystem: TurnSystem;

    private constructor(config: Partial<Config>) {
        this.logger.info(`Creation of Battle with config:`, config);
        assert(config.teamMap, "No team map provided");
        this.state = new GameState({
            width: config.width ?? 10,
            worldCenter: config.worldCenter ?? new Vector3(),
            teamMap: config.teamMap,
        });

        this.networkService = new NetworkService();
        this.turnSystem = new TurnSystem(this.state);

        // Create the SyncSystem to handle synchronization between state and network
        this.syncSystem = new SyncSystem(
            this.state,
            this.networkService,
            this.state.getEventBus()
        );

        this.state.getAllPlayers().forEach(p => {
            this.logger.info(`Initialising ClientSide for ${p.Name}`);
            this.networkService.createClientBattle(p, config);
        });

        this.setUpRemotes();
        this.round();
    }

    private setUpRemotes() {
        // Use NetworkService instead of direct remote access
        this.networkService.onGridStateRequest(p => {
            this.logger.debug(`Grid state requested by ${p.Name}`);
            return this.state.getGridState();
        });

        this.networkService.onTeamStateRequest(p => {
            this.logger.debug(`Team state requested by ${p.Name}`);
            return this.state.getTeamManager().getTeamStates();
        });

        this.networkService.onGameStateRequest(p => {
            this.logger.debug(`Game state requested by ${p.Name}`);
            return this.state.getInfo();
        });
    }

    private validate({ declaredAccess, client, trueAccessCode, winningClient }: ActionValidator) {
        const { token, action, allowed } = declaredAccess;
        const players = this.state.getAllPlayers();

        if (!players.find(p => p.UserId === client.UserId)) {
            this.logger.error(`Validation failed: Player ${client.Name} (${client.UserId}) not found in battle`);
            throw "Player not found";
        }

        if (!allowed) {
            this.logger.error(`Validation failed: Action not allowed for player ${client.Name}`);
            throw "Disallowed";
        }

        if (token !== trueAccessCode) {
            this.logger.error(`Validation failed: Invalid access code provided by ${client.Name}`);
            throw "Invalid access code";
        }

        if (!action) {
            this.logger.error(`Validation failed: No action chosen by ${client.Name}`);
            throw "No action chosen";
        }

        if (client.UserId !== winningClient.UserId) {
            this.logger.error(`Validation failed: Player ${client.Name} attempted to act out of turn`);
            throw "Not the winning player";
        }
    }

    private validateActionRequest({ winningClient, requestClient }: {
        winningClient: Player,
        requestClient: Player,
    }) {
        if (winningClient.UserId !== requestClient.UserId) {
            this.logger.warn(`Action request validation failed: Player ${requestClient.Name} attempted to act out of turn`);
            throw "Not the winning player";
        }
        return true;
    }

    private validateEnd({ client, declaredAccess, trueAccessCode, winningClient }: ActionValidator) {
        this.validate({ declaredAccess, client, trueAccessCode, winningClient });
        return true;
    }

    private checkMovementPossibility(action: MoveAction) {
        const { from, to } = action;
        const fromCell = this.state.getCell(from);
        const toCell = this.state.getCell(to);

        if (!fromCell) {
            this.logger.error(`Movement validation failed: No cell found at source position ${from}`);
            throw "No from cell found";
        }

        if (!toCell) {
            this.logger.error(`Movement validation failed: No cell found at target position ${to}`);
            throw "No to cell found";
        }

        const fromEntityID = fromCell.entity;
        const toEntityID = toCell.entity;

        if (!fromEntityID) {
            this.logger.error(`Movement validation failed: No entity found in source cell at ${from}`);
            throw "No entity found in from cell";
        }

        if (toEntityID) {
            this.logger.error(`Movement validation failed: Cell at ${to} is already occupied`);
            throw "Entity already present in to cell";
        }

        const fromEntity = this.state.getEntity(fromEntityID);
        if (!fromEntity) {
            this.logger.error(`Movement validation failed: Invalid entity ID ${fromEntityID}`);
            throw "Invalid entity ID";
        }

        const costOfMovement = MOVEMENT_COST * get2DManhattanDistance(from, to);
        const currentPosture = fromEntity.get('pos');

        if (currentPosture < costOfMovement) {
            this.logger.warn(`Movement validation failed: Entity ${fromEntity.name} has insufficient posture (${currentPosture}) for movement (cost: ${costOfMovement})`);
            throw "Not enough posture to move";
        }

        this.logger.debug(`Movement validation successful: ${fromEntity.name} can move from ${from} to ${to}`);
        return true;
    }

    private validateAction({ client, declaredAccess, trueAccessCode, winningClient }: ActionValidator) {
        this.validate({ declaredAccess, client, trueAccessCode, winningClient });

        const { action } = declaredAccess;
        if (action?.type === ActionType.Move) this.checkMovementPossibility(action as MoveAction);
        if (action?.type === ActionType.Attack) {
            // Attack validation logic would go here
            this.logger.debug(`Attack validation for ${client.Name}`);
        }

        return true;
    }

    private syncPlayerUIUpdates() {
        // Update Player UI's using the SyncSystem instead of direct network calls
        const currentActorID = this.turnSystem.getCurrentActorID(); if (!currentActorID) { this.logger.warn("No current actor ID found when syncing player UIs"); return; }
        const currentEntity = this.state.getEntity(currentActorID); if (!currentEntity) { this.logger.warn(`Current entity not found for ID: ${currentActorID}`); return; }
        this.state.getEventBus().emit(GameEvent.TURN_STARTED, currentEntity);
        this.logger.debug(`SyncSystem will notify clients about turn started for entity ID: ${currentActorID}`);
    }

    private async waitForResponse(winningClient: Player) {
        const network = this.networkService;
        const players = this.state.getAllPlayers();
        const accessCode = IDGenerator.generateID();
        const eventBus = this.state.getEventBus();

        this.logger.info(`Waiting for action from player ${winningClient.Name}, access code: ${accessCode}`);

        // Use NetworkService for handling remote requests
        network.onActRequest(p => {
            try {
                this.validateActionRequest({ winningClient, requestClient: p });
                this.logger.debug(`Action request from ${p.Name} validated successfully`);
                return { userId: p.UserId, allowed: true, token: accessCode };
            }
            catch (e) {
                this.logger.warn(`Action request validation failed for ${p.Name}: ${e}`);
                return { userId: p.UserId, allowed: false };
            }
        });

        let endPromiseResolve: (p: Player) => void;

        network.onActionExecution((actingPlayer, access) => {
            this.logger.info(`Received action request from ${actingPlayer.Name}`, access);

            // 1. Validate
            let er: unknown | undefined;
            try {
                this.validateAction({
                    client: actingPlayer,
                    declaredAccess: access,
                    trueAccessCode: accessCode,
                    winningClient: winningClient,
                });
            }
            catch (e) {
                er = e;
                this.logger.error(`Action validation failed for ${actingPlayer.Name}: ${e}`);
            }

            // 2. Commit if no error
            if (er) {
                this.logger.warn(`Action execution failed: ${er}`);
            }
            else {
                this.logger.info(`Committing action for ${actingPlayer.Name}`, access.action);

                // Commit the action to the state
                this.state.commit(access.action!);

                // Use the SyncSystem to handle animation propagation instead of direct network calls
                if (access.action) {
                    // The animation still needs to be sent directly since it's a special case
                    players.forEach(p => network.sendAnimationToPlayer(p, access));
                }
            }

            // 3. Let the SyncSystem handle grid/entity updates to all clients
            // The SyncSystem will automatically broadcast these changes due to the events emitted during commit
            this.syncSystem.syncClientState(actingPlayer);

            // 4. Check if pos of actingPlayer (cre) is below 75% and end round
            const cre = this.state.getEntity(actingPlayer.UserId);
            if (!cre) {
                this.logger.error(`Critical Error: CRE could not be found with actingPlayer.UserId ${actingPlayer.UserId}`);
                throw "Critical Error: CRE could not be found";
            }

            if (cre.playerID !== this.turnSystem.getCurrentActorID()) {
                this.logger.error(`Critical Error: CRE ID mismatch - expected ${this.turnSystem.getCurrentActorID()}, got ${cre.playerID}`);
                throw "Critical Error: CRE ID mismatch";
            }

            const posture = cre.get('pos');
            this.logger.debug(`Current posture for ${actingPlayer.Name}: ${posture}`);

            if (posture < 75) {
                this.logger.info(`Ending round: ${actingPlayer.Name}'s posture (${posture}) below 75`);
                // Emit turn ended event - this will be handled by the SyncSystem
                eventBus.emit(GameEvent.TURN_ENDED, cre);
                endPromiseResolve(actingPlayer);
            }

            return {
                userId: actingPlayer.UserId,
                allowed: er === undefined,
                token: accessCode,
                action: access.action,
            };
        });

        const endPromise = new Promise<Player>((resolve) => {
            endPromiseResolve = resolve;

            network.onTurnEnd((p, s) => {
                try {
                    this.validateEnd({
                        client: p,
                        declaredAccess: s,
                        trueAccessCode: accessCode,
                        winningClient: winningClient,
                    });
                    this.logger.info(`Turn end request validated for ${p.Name}`);

                    // Emit turn ended event - will be handled by SyncSystem
                    const entity = this.state.getEntity(p.UserId);
                    if (entity) {
                        eventBus.emit(GameEvent.TURN_ENDED, entity);
                    }

                    return true;
                }
                catch (e) {
                    this.logger.warn(`Invalid turn end request from ${p.Name}: ${e}`);
                    return false;
                }
            }).then((p) => {
                this.logger.info(`Turn ended by ${p.Name}`);
                resolve(p);
            });
        });

        return endPromise.then((p) => {
            this.logger.info(`Round ended by ${p.Name}`);
            // Clean up the event listeners for this round
        });
    }

    private async round() {
        const entity = this.turnSystem.progressToNextTurn();
        this.logger.info(`Starting new round with entity: ${entity?.name || "None"}`);
        if (!entity) {
            this.logger.error("No entity found for the next round");
            return;
        }
        this.state.setCRE(entity.playerID);

        const players = this.state.getAllPlayers();
        const winningClient = players.find(p => p.UserId === entity.playerID);
        if (!winningClient) {
            this.logger.error(`No winning client found for entity ${entity.name}`);
            return;
        }

        // Use syncPlayerUIUpdates which now relies on EventBus to notify clients
        this.syncPlayerUIUpdates();

        // Sync the current state to the winning player through the SyncSystem
        this.syncSystem.syncClientState(winningClient);

        await this.waitForResponse(winningClient);

        // After the round is complete, start a new round
        // This creates a continuous game loop
        this.round();
    }
}

