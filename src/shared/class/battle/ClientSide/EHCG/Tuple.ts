import EntityGraphics from "shared/class/battle/Entity/Graphics";
import HexCellGraphics from "shared/class/battle/Hex/Cell/Graphics";

export default class EntityCellGraphicsTuple {
    public entity?: EntityGraphics;
    public cell: HexCellGraphics;

    constructor(cell: HexCellGraphics, entity?: EntityGraphics) {
        this.entity = entity;
        this.cell = cell;

        if (this.entity) {
            this.couple(this.entity)
        }
    }

    couple(entity: EntityGraphics, resetPosition = true) {
        const oldEntity = this.decouple();

        this.entity = entity;
        const targetPosition = this.cell.part.Position;
        this.entity.model.Parent = this.cell.part;
        if (resetPosition) this.entity.model.PivotTo(new CFrame(targetPosition.X, 0, targetPosition.Z));

        return oldEntity;
    }

    decouple() {
        if (!this.entity) return;
        this.entity.model.Parent = undefined;
        return this.entity;
    }
}