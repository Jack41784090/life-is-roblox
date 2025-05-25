import Logger from "shared/utils/Logger";
import { ClientActionValidator } from "../Client/ClientValidation";
import State from "../State";
import { ActionType, ActionValidator as ActionValidatorType, BattleAction, MoveAction } from "../types";

export class ServerActionValidator {
    private logger = Logger.createContextLogger("BattleValidator");
    private sharedValidator: ClientActionValidator;

    constructor(
        private state: State,
        private givenTokens: string[]
    ) {
        this.sharedValidator = new ClientActionValidator(state);
    }

    validateBaseActionInfo({ declaredAccess, client, winningClient }: ActionValidatorType): boolean {
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

    validateActionRequest({ winningClient, requestClient }: {
        winningClient: Player,
        requestClient: Player,
    }): boolean {
        if (winningClient.UserId !== requestClient.UserId) {
            this.logger.warn(`Action request validation failed: Player ${requestClient.Name} attempted to request action, but it is ${winningClient.Name}'s turn.`);
            return false;
        }
        return true;
    }

    validateEndTurnRequest(validatorProps: ActionValidatorType): boolean {
        return this.validateBaseActionInfo(validatorProps);
    }

    validateServerSpecificRules(action: BattleAction, entityPerformingAction: Player): boolean {
        switch (action.type) {
            case ActionType.Move:
                return this.validateEntityOwnershipOfMovement(action as MoveAction, entityPerformingAction);
            default:
                return true;
        }
    }

    validateEntityOwnershipOfMovement(action: MoveAction, entityPerformingMovement: Player): boolean {
        const { from } = action;
        const fromCell = this.state.getCell(from);

        if (!fromCell || !fromCell.entity) {
            this.logger.error(`Server validation failed: Invalid source cell or no entity at ${from}`);
            return false;
        }

        const fromEntityState = this.state.getEntity(fromCell.entity);

        if (!fromEntityState) {
            this.logger.error(`Server validation failed: Invalid entity ID ${fromCell.entity} in state.`);
            return false;
        }

        if (fromEntityState.playerID !== entityPerformingMovement.UserId) {
            this.logger.error(`Server validation failed: Entity in cell ${from} (${fromEntityState.playerID}) does not match acting player ${entityPerformingMovement.Name} (${entityPerformingMovement.UserId}).`);
            return false;
        }

        return true;
    }

    validateFullAction(validatorProps: ActionValidatorType): boolean {
        if (!this.validateBaseActionInfo(validatorProps)) {
            return false;
        }

        const { action } = validatorProps.declaredAccess;
        const actingPlayer = validatorProps.client;
        const entityId = actingPlayer.UserId;

        if (!this.sharedValidator.validateActionFormat(action)) {
            this.logger.error(`Full action validation failed: Invalid action format.`);
            return false;
        }

        if (action?.type === ActionType.Move) {
            const moveAction = action as MoveAction;

            if (!this.validateEntityOwnershipOfMovement(moveAction, actingPlayer)) {
                return false;
            }

            if (!this.sharedValidator.validateLocalMove(moveAction)) {
                return false;
            }
        }

        return true;
    }
}
