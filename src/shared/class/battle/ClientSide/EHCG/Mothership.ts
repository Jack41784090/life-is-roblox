import EntityCellGraphicsTuple from "shared/class/battle/ClientSide/EHCG/Tuple";
import Entity from "shared/class/battle/Entity";
import HexCellGraphics from "shared/class/battle/Hex/Cell/Graphics";
import HexGrid from "shared/class/battle/Hex/Grid";
import { QR } from "shared/class/XY";
import { EntityState, HexGridState, PlayerID, TeamState } from "shared/types/battle-types";
import { getModelTemplateByID } from "shared/utils";
import EntityGraphics from "../../Entity/Graphics";

export default class EntityHexCellGraphicsMothership {
    private idTupleMap: Map<PlayerID, EntityCellGraphicsTuple> = new Map();
    private tupleQR: QR<EntityCellGraphicsTuple>;
    private height: number;
    private size: number;
    private grid: HexGrid;

    constructor(radius: number, height: number, size: number, grid: HexGrid) {
        this.tupleQR = new QR<EntityCellGraphicsTuple>(radius);
        this.height = height;
        this.size = size;
        this.grid = grid;
    }

    tuples(): EntityCellGraphicsTuple[] {
        return this.tupleQR.values();
    }

    addTuple(playerID: number, tuple: EntityCellGraphicsTuple) {
        this.idTupleMap.set(playerID, tuple);
        if (this.tupleQR.get(tuple.cell.qrs)) {
            warn(`Tuple already exists at ${tuple.cell.qrs}`);
        }
        else {
            this.tupleQR.set(tuple.cell.qrs, tuple);
        }
    }

    removeTuple(x: number, y: number): void;
    removeTuple(qrs: Vector2): void;
    removeTuple(qr: Vector3): void;
    removeTuple(qr: Vector2 | Vector3 | number, y?: number) {
        let tuple: EntityCellGraphicsTuple | undefined;

        if (typeOf(qr) === "number" && typeOf(y) === "number") {
            tuple = this.tupleQR.get(qr as number, y as number);
        }
        else if (typeOf(qr) === "Vector2" || typeOf(qr) === "Vector3") {
            tuple = this.tupleQR.get(qr as Vector2);
        }

        if (!tuple) return;

        if (tuple.entity) {
            this.idTupleMap.forEach((t, playerID) => {
                if (t === tuple) {
                    this.idTupleMap.delete(playerID);
                }
            });
        }
        this.tupleQR.delete(tuple.cell.qrs);
    }

    findTupleByEntity(entity: Entity) {
        if (!entity.qr) {
            return undefined;
        }
        return this.tupleQR.get(entity.qr);
    }

    positionTuple(qr: Vector2) {
        assert(this.grid.model, "Grid model not set");
        return this.tupleQR.get(qr) ?? this.tupleQR.set(qr, new EntityCellGraphicsTuple(
            new HexCellGraphics({
                qr: qr,
                parent: this.grid.model,
                worldPosition: this.grid.findWorldPositionFromQRS(qr),
                height: this.height,
                size: this.size,
            })
        ))
    }

    async syncGrid(hgs: HexGridState) {
        print(`Graphically syncing grid`, hgs);
        const cells = hgs.cells;
        for (const c of cells) {
            const p = this.positionTuple(c.qr);
        }
    }

    async syncTeams(teamStates: TeamState[]) {
        print(`Graphically syncing teams`, teamStates, this.idTupleMap);
        for (const teamState of teamStates) {
            for (const entityState of teamState.members) {
                const newQR = entityState.qr;
                if (!newQR) continue;
                const playerTuple = this.idTupleMap.get(entityState.playerID);

                // 1. entity updated his location => move the tuple to the new location
                if (playerTuple) {
                    print(`Existing: ${entityState.playerID} => ${newQR}`);
                    const oldQR = playerTuple.cell.qr;
                    if (newQR === oldQR) continue;
                    this.repositionPlayer(entityState.playerID, newQR);
                }
                // 2. entity is a new player => create a new tuple for him
                else {
                    print(`New player: ${entityState.playerID} => ${newQR}`);
                    this.positionNewPlayer(entityState, newQR);
                }
            }
        }
    }

    positionNewPlayer(entityState: EntityState, qr: Vector2) {
        const modelID = entityState.stats.id;
        const model = getModelTemplateByID(modelID)
        assert(model, `Model name: "${modelID}" not found.`)

        const newEntityG = new EntityGraphics(model);
        const newTuple = this.positionTuple(qr);
        newTuple.couple(newEntityG);
        this.idTupleMap.set(entityState.playerID, newTuple);
    }

    repositionPlayer(playerID: PlayerID, newQR: Vector2) {
        print(`Repositioning player ${playerID} to ${newQR}`);
        const playerTuple = this.idTupleMap.get(playerID);
        if (!playerTuple) {
            warn(`Player tuple not found for ${playerID}`);
            return;
        }
        const entity = playerTuple.decouple()!;
        const newTuple = this.positionTuple(newQR)
        newTuple.couple(entity);
        this.addTuple(playerID, newTuple);
    }

    async moveEntity(start: Vector2, dest: Vector2) {
        const tuple = this.tupleQR.get(start);
        const entity = tuple?.decouple();
        if (!entity) {
            warn(`Entity not found at ${start}`);
            return;
        }

        const cell = this.tupleQR.get(dest)?.cell ?? this.positionTuple(dest).cell;
        const endTuple = await entity.moveToCell(cell);
        this.tupleQR.set(dest, endTuple);
    }
}