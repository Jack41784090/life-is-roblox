import Logger from "shared/utils/Logger";
import State from "../State";
import { ActionType, BattleAction, MoveAction } from "../types";

export class ClientActionValidator {
    private logger = Logger.createContextLogger("ClientBattleValidator");

    constructor(private state: State) { }
    validateActionFormat(action: BattleAction | undefined): boolean {
        if (!action) return false;

        switch (action.type) {
            case ActionType.Move:
                const moveAction = action as MoveAction;
                return moveAction.from !== undefined &&
                    moveAction.to !== undefined;

            case ActionType.Attack:
                return true;

            case ActionType.ResolveAttacks:
                return true;

            case ActionType.StyleSwitch:
                return true;

            default:
                return false;
        }
    }

    validateLocalMove(action: MoveAction): boolean {
        const { from, to } = action;

        const fromCell = this.state.getCell(from);
        if (!fromCell || !fromCell.entity) {
            this.logger.warn(`Local move validation failed: No entity in source cell.`);
            return false;
        }

        const toCell = this.state.getCell(to);
        if (!toCell) {
            this.logger.warn(`Local move validation failed: Target cell doesn't exist.`);
            return false;
        }

        if (toCell.entity) {
            this.logger.warn(`Local move validation failed: Target cell is occupied.`);
            return false;
        }

        return true;
    }

    validateLocalAction(action: BattleAction | undefined): boolean {
        if (!this.validateActionFormat(action)) {
            this.logger.warn(`Local action validation failed: Invalid action format.`);
            return false;
        }

        if (!action) return false;

        switch (action.type) {
            case ActionType.Move:
                return this.validateLocalMove(action as MoveAction);

            case ActionType.Attack:
                return true;

            case ActionType.ResolveAttacks:
                return true;

            case ActionType.StyleSwitch:
                return true;

            default:
                return false;
        }
    }
}
