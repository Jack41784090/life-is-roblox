import EntityCellGraphicsTuple from "shared/class/battle/Client/Graphics/Tuple";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";
import { PlayerID } from "shared/class/battle/types";
import { QR } from "shared/class/XY";
import Logger from "shared/utils/Logger";
import Entity from "../../State/Entity";
import EntityGraphics from "../../State/Entity/Graphics";

export default class TupleManager {
    private logger = Logger.createContextLogger("TupleManager");
    private tupleQR: QR<EntityCellGraphicsTuple>;
    private playerIdToPosition: Map<PlayerID, Vector2> = new Map();
    private entityToPlayerId: Map<EntityGraphics, PlayerID> = new Map();

    constructor(radius: number) {
        this.tupleQR = new QR<EntityCellGraphicsTuple>(radius);
    }

    public values(): EntityCellGraphicsTuple[] {
        return this.tupleQR.values();
    }

    public addTuple(playerID: PlayerID, tuple: EntityCellGraphicsTuple): void {
        const position = new Vector2(tuple.cellGraphics.qrs.X, tuple.cellGraphics.qrs.Y);

        const existingTuple = this.tupleQR.get(position);
        if (existingTuple) {
            this.logger.warn(`Tuple already exists at ${position}, replacing it`);
            this.removeTupleInternal(existingTuple);
        }

        this.tupleQR.set(position, tuple);
        this.playerIdToPosition.set(playerID, position);

        if (tuple.entityGraphics) {
            this.entityToPlayerId.set(tuple.entityGraphics, playerID);
        }

        this.logger.info(`Added tuple for player ${playerID} at ${position}`);
    }

    public removeTuple(x: number, y: number): void;
    public removeTuple(qrs: Vector2): void;
    public removeTuple(qr: Vector3): void;
    public removeTuple(qr: Vector2 | Vector3 | number, y?: number): void {
        let tuple: EntityCellGraphicsTuple | undefined;

        if (typeOf(qr) === "number" && typeOf(y) === "number") {
            tuple = this.tupleQR.get(qr as number, y as number);
        } else if (typeOf(qr) === "Vector2" || typeOf(qr) === "Vector3") {
            tuple = this.tupleQR.get(qr as Vector2);
        }

        if (!tuple) {
            this.logger.warn(`No tuple found to remove at position ${qr}`);
            return;
        }

        this.removeTupleInternal(tuple);
        this.logger.info(`Removed tuple at position ${tuple.cellGraphics.qrs}`);
    }

    public removeTupleByPlayerId(playerID: PlayerID): void {
        const position = this.playerIdToPosition.get(playerID);
        if (!position) {
            this.logger.warn(`No position found for player ${playerID}`);
            return;
        }

        const tuple = this.tupleQR.get(position);
        if (!tuple) {
            this.logger.warn(`No tuple found at position ${position} for player ${playerID}`);
            return;
        }

        this.removeTupleInternal(tuple);
        this.logger.info(`Removed tuple for player ${playerID} at position ${position}`);
    }

    private removeTupleInternal(tuple: EntityCellGraphicsTuple): void {
        const position = new Vector2(tuple.cellGraphics.qrs.X, tuple.cellGraphics.qrs.Y);

        if (tuple.entityGraphics) {
            const playerID = this.entityToPlayerId.get(tuple.entityGraphics);
            if (playerID !== undefined) {
                this.playerIdToPosition.delete(playerID);
                this.entityToPlayerId.delete(tuple.entityGraphics);
            }
        }

        this.tupleQR.delete(position);
    }

    public getTupleByPosition(qr: Vector2): EntityCellGraphicsTuple | undefined;
    public getTupleByPosition(qr: Vector3): EntityCellGraphicsTuple | undefined;
    public getTupleByPosition(x: number, y: number): EntityCellGraphicsTuple | undefined;
    public getTupleByPosition(qr: Vector2 | Vector3 | number, y?: number): EntityCellGraphicsTuple | undefined {
        if (typeOf(qr) === "number" && typeOf(y) === "number") {
            return this.tupleQR.get(qr as number, y as number);
        }
        return this.tupleQR.get(qr as Vector2);
    }

    public getTupleByPlayerId(playerID: PlayerID): EntityCellGraphicsTuple | undefined {
        const position = this.playerIdToPosition.get(playerID);
        this.logger.debug(`Getting tuple for player ${playerID}; looking into position ${position}`); //checkthis
        if (!position) return undefined;
        return this.tupleQR.get(position);
    }

    public getTupleByEntity(entity: Entity): EntityCellGraphicsTuple | undefined {
        return this.tupleQR.get(entity.qr);
    }

    public getEntityGraphics(playerID: PlayerID): EntityGraphics | undefined;
    public getEntityGraphics(entity: Entity): EntityGraphics | undefined;
    public getEntityGraphics(qr: Vector2): EntityGraphics | undefined;
    public getEntityGraphics(qrs: Vector3): EntityGraphics | undefined;
    public getEntityGraphics(query: Vector2 | Vector3 | Entity | PlayerID): EntityGraphics | undefined { //checkthis
        let tuple: EntityCellGraphicsTuple | undefined;

        if (typeIs(query, 'Vector2') || typeIs(query, 'Vector3')) {
            tuple = this.getTupleByPosition(query as Vector2);
        } else if (query instanceof Entity) {
            tuple = this.getTupleByEntity(query);
        } else if (typeIs(query, 'number')) {
            tuple = this.getTupleByPlayerId(query); //checkthis
        }

        return tuple?.entityGraphics;
    }

    public getCellGraphics(qr: Vector2): HexCellGraphics | undefined;
    public getCellGraphics(qrs: Vector3): HexCellGraphics | undefined;
    public getCellGraphics(dest: Vector2 | Vector3): HexCellGraphics | undefined {
        const tuple = this.getTupleByPosition(dest as Vector2);
        return tuple?.cellGraphics;
    }

    public getPlayerIdFromEntityGraphics(entityG: EntityGraphics): PlayerID | undefined {
        return this.entityToPlayerId.get(entityG);
    }

    public setTupleAtPosition(qr: Vector2, tuple: EntityCellGraphicsTuple): EntityCellGraphicsTuple {
        return this.tupleQR.set(qr, tuple);
    }

    public updatePlayerPosition(playerID: PlayerID, oldPosition: Vector2, newPosition: Vector2): void {
        const context = 'updating player position';

        // Skip if old and new positions are the same
        if (oldPosition.X === newPosition.X && oldPosition.Y === newPosition.Y) {
            this.logger.info(`Player ${playerID} position unchanged at ${newPosition}`, context);
            return;
        }

        // Get both old and new tuples
        const oldTuple = this.tupleQR.get(oldPosition);
        if (!oldTuple) {
            this.logger.warn(`No tuple found at old position ${oldPosition} for player ${playerID}`, context);
            return;
        }
        const entityAttached = oldTuple.decouple();
        if (!entityAttached) {
            this.logger.warn(`No entity found attached to tuple at old position ${oldPosition} for player ${playerID}`, context);
            return;
        }
        const existingTuple = this.tupleQR.get(newPosition)
        if (!existingTuple) {
            this.logger.warn(`No tuple found at new position ${newPosition} for player ${playerID}`, context);
            return;
        }

        // coupling with what was decoupled in the old position
        existingTuple.couple(entityAttached)
        this.playerIdToPosition.set(playerID, newPosition);

        this.logger.info(`Updated player ${playerID} position from ${oldPosition} to ${newPosition}`, context);
    }

    public associateEntityWithPlayer(entityGraphics: EntityGraphics, playerID: PlayerID): void {
        this.entityToPlayerId.set(entityGraphics, playerID);
    }
}
