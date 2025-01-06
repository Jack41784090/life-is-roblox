import EntityGraphics from "shared/class/battle/Entity/Graphics";
import HexCellGraphics from "shared/class/battle/Hex/Cell/Graphics";

export default class EntityCellGraphicsTuple {
    public entityGraphics?: EntityGraphics;
    public cellGraphics: HexCellGraphics;

    constructor(cell: HexCellGraphics, entity?: EntityGraphics) {
        this.entityGraphics = entity;
        this.cellGraphics = cell;

        if (this.entityGraphics) {
            this.couple(this.entityGraphics)
        }
    }

    couple(entity: EntityGraphics) {
        const oldEntity = this.decouple();

        this.entityGraphics = entity;
        const targetPosition = this.cellGraphics.part.Position;
        this.entityGraphics.model.Parent = this.cellGraphics.part;
        this.entityGraphics.moveToPosition(targetPosition);

        return oldEntity;
    }

    decouple() {
        if (!this.entityGraphics) return;
        this.entityGraphics.model.Parent = undefined;
        const e = this.entityGraphics
        this.entityGraphics = undefined;
        return e;
    }
}