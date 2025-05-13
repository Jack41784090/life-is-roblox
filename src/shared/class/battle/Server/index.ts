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

}

