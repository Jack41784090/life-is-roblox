import { Workspace } from "@rbxts/services";
import EntityCellGraphicsTuple from "shared/class/battle/Client/Graphics/Tuple";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";
import { HexGridState, PlayerID, StateState, TeamState } from "shared/class/battle/types";
import { QR } from "shared/class/XY";
import { getModelTemplateByID } from "shared/utils";
import Logger from "shared/utils/Logger";
import Pathfinding from "../../Pathfinding";
import Entity from "../../State/Entity";
import EntityGraphics from "../../State/Entity/Graphics";
import { EntityState } from "../../State/Entity/types";
import HexGrid from "../../State/Hex/Grid";

export default class Graphics {
    private logger = Logger.createContextLogger("EHCG-Mothership");
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

    public tuples(): EntityCellGraphicsTuple[] {
        return this.tupleQR.values();
    }

    public addTuple(playerID: number, tuple: EntityCellGraphicsTuple) {
        this.idTupleMap.set(playerID, tuple);
        if (this.tupleQR.get(tuple.cellGraphics.qrs)) {
            this.logger.warn(`Tuple already exists at ${tuple.cellGraphics.qrs}`);
        }
        else {
            this.tupleQR.set(tuple.cellGraphics.qrs, tuple);
        }
    }

    public removeTuple(x: number, y: number): void;
    public removeTuple(qrs: Vector2): void;
    public removeTuple(qr: Vector3): void;
    public removeTuple(qr: Vector2 | Vector3 | number, y?: number) {
        let tuple: EntityCellGraphicsTuple | undefined;

        if (typeOf(qr) === "number" && typeOf(y) === "number") {
            tuple = this.tupleQR.get(qr as number, y as number);
        }
        else if (typeOf(qr) === "Vector2" || typeOf(qr) === "Vector3") {
            tuple = this.tupleQR.get(qr as Vector2);
        }

        if (!tuple) return;

        if (tuple.entityGraphics) {
            this.idTupleMap.forEach((t, playerID) => {
                if (t === tuple) {
                    this.idTupleMap.delete(playerID);
                }
            });
        }
        this.tupleQR.delete(tuple.cellGraphics.qrs);
    }

    public findTupleByEntity(entity: Entity) {
        this.logger.debug(this.tupleQR, 'by', entity.qr);
        return this.tupleQR.get(entity.qr);
    }

    public findEntityG(playerID: PlayerID): EntityGraphics;
    public findEntityG(entity: Entity): EntityGraphics;
    public findEntityG(qr: Vector2): EntityGraphics;
    public findEntityG(qrs: Vector3): EntityGraphics;
    public findEntityG(qr: Vector2 | Vector3 | Entity | PlayerID) {
        let tuple: EntityCellGraphicsTuple | undefined;
        if (typeIs(qr, 'Vector2') || typeIs(qr, 'Vector3')) {
            tuple = this.tupleQR.get(qr as Vector2);
        }
        else if (qr instanceof Entity) {
            tuple = this.findTupleByEntity(qr);
        }
        else if (typeIs(qr, 'number')) {
            tuple = this.idTupleMap.get(qr);
        }

        return tuple?.entityGraphics;
    }

    public findCellG(qr: Vector2): HexCellGraphics;
    public findCellG(qrs: Vector3): HexCellGraphics;
    public findCellG(dest: Vector2 | Vector3) {
        return this.tupleQR.get(dest as Vector2)?.cellGraphics;
    }

    public findEntityGByEntity(entity: Entity) {
        const tuple = this.findTupleByEntity(entity);
        return tuple?.entityGraphics;
    }

    public positionTuple(qr: Vector2) {
        assert(this.grid.model, "Grid model not set");
        return this.tupleQR.get(qr) ??
            this.tupleQR.set(qr, new EntityCellGraphicsTuple(
                new HexCellGraphics({
                    qr: qr,
                    parent: this.grid.model,
                    worldPosition: this.grid.findWorldPositionFromQRS(qr),
                    height: this.height,
                    size: this.size,
                })
            ))
    }

    public async sync(stateState: StateState) {
        const syncs: Promise<void>[] = [];
        syncs.push(this.syncGrid(stateState.grid), this.syncTeams(stateState.teams))
        return Promise.all(syncs)
    }

    public async syncGrid(hgs: HexGridState) {
        this.logger.info(`Graphically syncing grid`, hgs);
        const cells = hgs.cells;
        for (const c of cells) {
            const p = this.positionTuple(c.qr);
        }
    }

    public async syncTeams(teamStates: TeamState[]) {
        this.logger.info(`Graphically syncing teams`, teamStates, this.idTupleMap);
        for (const teamState of teamStates) {
            for (const entityState of teamState.members) {
                const newQR = entityState.qr;
                const playerTuple = this.idTupleMap.get(entityState.playerID);

                // 1. entity updated his location => move the tuple to the new location
                if (playerTuple) {
                    this.logger.info(`Existing: ${entityState.playerID} => ${newQR}`);
                    const oldQR = playerTuple.cellGraphics.qr;
                    if (newQR === oldQR) {
                        this.logger.info(`||=> Player ${entityState.playerID} is already at ${newQR}`);
                        continue;
                    }
                    this.repositionPlayer(entityState.playerID, newQR);
                }
                // 2. entity is a new player => create a new tuple for him
                else {
                    this.logger.info(`New player: ${entityState.playerID} => ${newQR}`);
                    this.positionNewPlayer(entityState, newQR);
                }
            }
        }
    }

    public positionNewPlayer(entityState: EntityState, qr: Vector2) {
        const modelID = entityState.stats.id;
        const model = getModelTemplateByID(modelID)
        assert(model, `Model name: "${modelID}" not found.`)

        const newEntityG = new EntityGraphics(model);
        const newTuple = this.positionTuple(qr);
        newTuple.couple(newEntityG);
        this.idTupleMap.set(entityState.playerID, newTuple);
    }

    public repositionPlayer(playerID: PlayerID, newQR: Vector2) {
        this.logger.info(`Repositioning player ${playerID} to ${newQR}`);
        const playerTuple = this.idTupleMap.get(playerID);
        if (!playerTuple) {
            this.logger.warn(`Player tuple not found for ${playerID}`);
            return;
        }
        const entity = playerTuple.decouple()!;
        const newTuple = this.positionTuple(newQR)
        newTuple.couple(entity);
        this.addTuple(playerID, newTuple);
    }

    public async moveEntity(start: Vector2, dest: Vector2) {
        this.logger.info(`Moving entity from ${start} to ${dest}`);
        const tuple = this.tupleQR.get(start);
        const entity = tuple?.decouple();
        if (!entity) {
            this.logger.warn(`Entity not found at ${start}`);
            return;
        }
        entity.model.Parent = Workspace;
        const destinationCell = this.tupleQR.get(dest)?.cellGraphics ?? this.positionTuple(dest).cellGraphics;

        const path = (new Pathfinding({ grid: this.grid.info(), dest, start, })).begin()
        await entity.moveToCell(destinationCell, path.mapFiltered(p => this.tupleQR.get(p)?.cellGraphics));

        this.tupleQR.set(dest, new EntityCellGraphicsTuple(destinationCell, entity));

    }
}