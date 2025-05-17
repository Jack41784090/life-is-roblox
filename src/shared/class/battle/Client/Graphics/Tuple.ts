import EntityGraphics from "shared/class/battle/State/Entity/Graphics";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";
import Logger from "shared/utils/Logger";

export default class EntityCellGraphicsTuple {
    private logger = Logger.createContextLogger("EntityCellGraphicsTuple");
    public entityGraphics?: EntityGraphics;
    public cellGraphics: HexCellGraphics;

    constructor(cell: HexCellGraphics, entity?: EntityGraphics) {
        this.logger.debug(`Creating tuple for cell: ${cell.part.Name} with entity: ${entity?.model.Name}`);
        this.entityGraphics = entity;
        this.cellGraphics = cell;
        if (this.entityGraphics) {
            this.couple(this.entityGraphics)
        }
    }

    couple(entity: EntityGraphics) {
        this.logger.debug(`Coupling entity: ${entity.model.Name} to cell: ${this.cellGraphics.part.Name}`);

        const oldEntity = this.decouple();
        this.entityGraphics = entity;
        const targetPosition = this.cellGraphics.part.Position;
        this.entityGraphics.model.Parent = this.cellGraphics.part;
        this.entityGraphics.moveToPosition(targetPosition);

        return oldEntity;
    }

    decouple() {
        this.logger.debug(`Decoupling entity: ${this.entityGraphics?.model.Name} from cell: ${this.cellGraphics.part.Name}`);
        if (!this.entityGraphics) return;
        this.entityGraphics.model.Parent = undefined;
        const e = this.entityGraphics
        this.entityGraphics = undefined;
        return e;
    }
}