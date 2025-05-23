import { Workspace } from "@rbxts/services";
import EntityCellGraphicsTuple from "shared/class/battle/Client/Graphics/Tuple";
import HexCellGraphics from "shared/class/battle/State/Hex/Cell/Graphics";
import { HexGridState, PlayerID, StateState, TeamState } from "shared/class/battle/types";
import { getModelTemplateByID } from "shared/utils";
import Logger from "shared/utils/Logger";
import Pathfinding from "../../Pathfinding";
import Entity from "../../State/Entity";
import EntityGraphics from "../../State/Entity/Graphics";
import { EntityState } from "../../State/Entity/types";
import HexGrid from "../../State/Hex/Grid";
import TupleManager from "./TupleManager";

export default class Graphics {
    private logger = Logger.createContextLogger("Graphics");
    private tupleManager: TupleManager;
    private height: number;
    private size: number;
    private grid: HexGrid;

    constructor(radius: number, height: number, size: number, grid: HexGrid) {
        this.tupleManager = new TupleManager(radius);
        this.height = height;
        this.size = size;
        this.grid = grid;
    }

    public getTuples(): EntityCellGraphicsTuple[] {
        return this.tupleManager.values();
    }

    public addTuple(playerID: number, tuple: EntityCellGraphicsTuple) {
        this.tupleManager.addTuple(playerID, tuple);
    }

    public removeTuple(x: number, y: number): void;
    public removeTuple(qrs: Vector2): void;
    public removeTuple(qr: Vector3): void;
    public removeTuple(qr: Vector2 | Vector3 | number, y?: number) {
        if (typeOf(qr) === "number" && typeOf(y) === "number") {
            this.tupleManager.removeTuple(qr as number, y as number);
        } else {
            this.tupleManager.removeTuple(qr as Vector2);
        }
    }

    public findEntityG(playerID: PlayerID): EntityGraphics | undefined;
    public findEntityG(entity: Entity): EntityGraphics | undefined;
    public findEntityG(qr: Vector2): EntityGraphics | undefined;
    public findEntityG(qrs: Vector3): EntityGraphics | undefined;
    public findEntityG(qr: Vector2 | Vector3 | Entity | PlayerID): EntityGraphics | undefined {
        return this.tupleManager.getEntityGraphics(qr as any); //checkthis
    }

    public findCellG(qr: Vector2): HexCellGraphics | undefined;
    public findCellG(qrs: Vector3): HexCellGraphics | undefined;
    public findCellG(dest: Vector2 | Vector3): HexCellGraphics | undefined {
        return this.tupleManager.getCellGraphics(dest as any);
    }

    public findEntityGByEntity(entity: Entity): EntityGraphics | undefined {
        return this.tupleManager.getEntityGraphics(entity);
    }

    public positionTuple(qr: Vector2) {
        assert(this.grid.model, "Grid model not set");
        return this.tupleManager.getTupleByPosition(qr) ??
            this.tupleManager.setTupleAtPosition(qr, new EntityCellGraphicsTuple(
                new HexCellGraphics({
                    qr: qr,
                    parent: this.grid.model,
                    worldPosition: this.grid.findWorldPositionFromQRS(qr),
                    height: this.height,
                    size: this.size,
                })
            ));
    }

    public async sync(stateState: StateState) {
        const syncs: Promise<void>[] = [];
        syncs.push(this.syncGrid(stateState.grid), this.syncTeams(stateState.teams));
        return Promise.all(syncs);
    }

    public async syncGrid(hgs: HexGridState) {
        this.logger.info(`Graphically syncing grid`, hgs);
        const cells = hgs.cells;
        for (const c of cells) {
            const p = this.positionTuple(c.qr);
        }
    }

    public async syncTeams(teamStates: TeamState[]) {
        this.logger.info(`Graphically syncing teams`, teamStates);
        for (const teamState of teamStates) {
            for (const entityState of teamState.members) {
                const newQR = entityState.qr;
                const playerTuple = this.tupleManager.getTupleByPlayerId(entityState.playerID);

                if (playerTuple) {
                    this.logger.info(`Existing: ${entityState.playerID} => [${newQR}]`);
                    const oldQR = playerTuple.cellGraphics.qr;
                    // Proper comparison of Vector2 positions
                    if (newQR.X === oldQR.X && newQR.Y === oldQR.Y) {
                        this.logger.info(`||=> Player ${entityState.playerID} is already at ${newQR}`);
                        continue;
                    }
                    this.repositionPlayer(entityState.playerID, newQR);
                } else {
                    this.logger.info(`New player: ${entityState.playerID} => [${newQR}]`);
                    this.positionNewPlayer(entityState, newQR);
                }
            }
        }
    }

    public positionNewPlayer(entityState: EntityState, qr: Vector2) {
        const modelID = entityState.stats.id;
        const newEntityG = this.createEntityGraphics(modelID, entityState.playerID);
        const newTuple = this.positionTuple(qr);
        newTuple.couple(newEntityG);
        this.tupleManager.addTuple(entityState.playerID, newTuple);
        this.logger.info(`Player ${entityState.playerID} positioned at [${qr}]`);
        return newEntityG;
    }

    public repositionPlayer(playerID: PlayerID, newQR: Vector2) {
        // Verify if player actually needs to be repositioned
        const playerTuple = this.tupleManager.getTupleByPlayerId(playerID);
        if (!playerTuple) {
            this.logger.warn(`Player tuple not found for ${playerID}`);
            return;
        }
        const oldQR = playerTuple.cellGraphics.qr;
        if (oldQR.X === newQR.X && oldQR.Y === newQR.Y) {
            this.logger.info(`Player ${playerID} is already at ${newQR}, skipping repositioning`);
            return;
        }

        // Reposition the player
        const entity = playerTuple.entityGraphics;
        if (!entity) {
            this.logger.warn(`Entity graphics not found for player ${playerID}`);
            return;
        }
        this.tupleManager.updatePlayerPosition(playerID, oldQR, newQR);
        this.tupleManager.associateEntityWithPlayer(entity, playerID);

        this.logger.info(`Player ${playerID} repositioned from [${oldQR}] to [${newQR}]`);
    }

    public async moveEntity(start: Vector2, dest: Vector2) {
        // Skip if start and destination are the same
        if (start.X === dest.X && start.Y === dest.Y) {
            this.logger.info(`Entity already at destination ${dest}, skipping movement`);
            return Promise.resolve();
        }

        this.logger.info(`Moving entity from ${start} to ${dest}`);
        const startTuple = this.tupleManager.getTupleByPosition(start);

        // Enhanced entity validation
        if (!startTuple) {
            this.logger.warn(`No tuple found at source position ${start}`);
            return Promise.reject(`No tuple found at source position ${start}`);
        }

        const entity = startTuple.decouple();
        if (!entity) {
            this.logger.warn(`Entity not found at ${start}`);
            return Promise.reject(`Entity not found at ${start}`);
        }

        const playerID = this.tupleManager.getPlayerIdFromEntityGraphics(entity);

        entity.model.Parent = Workspace;
        const destinationCell = this.tupleManager.getCellGraphics(dest) ?? this.positionTuple(dest).cellGraphics;

        try {
            const path = (new Pathfinding({ grid: this.grid.info(), dest, start })).begin();

            // Check if path is empty
            if (path.size() === 0) {
                this.logger.warn(`No valid path found from ${start} to ${dest}`);
                return Promise.reject(`No valid path found from ${start} to ${dest}`);
            }

            // Convert path to cell graphics
            const cellPath = path.mapFiltered(p => {
                const cell = this.tupleManager.getCellGraphics(p);
                if (!cell) {
                    this.logger.warn(`No cell graphics found for position ${p}`);
                }
                return cell;
            });

            await entity.moveToCell(destinationCell, cellPath);

            // Check if destination already has a tuple and handle appropriately
            const destTuple = this.tupleManager.getTupleByPosition(dest);
            if (destTuple && destTuple !== startTuple) {
                this.logger.warn(`Destination ${dest} already has a tuple, decoupling it and discarding the entity`);
                destTuple.decouple();
            }

            const newTuple = new EntityCellGraphicsTuple(destinationCell, entity);
            this.tupleManager.setTupleAtPosition(dest, newTuple);

            if (playerID) {
                this.tupleManager.addTuple(playerID, newTuple);
                this.logger.info(`Updated player ${playerID} position to ${dest}`);
            } else {
                this.logger.warn(`Could not find player ID for entity at ${start}, maps may be inconsistent`);
            }

            return Promise.resolve();
        } catch (error) {
            this.logger.error(`Error moving entity from ${start} to ${dest}: ${error}`);

            // Try to recover by placing the entity back at the start position
            const startTuple = this.tupleManager.getTupleByPosition(start);
            if (startTuple) {
                startTuple.couple(entity);
                this.logger.info(`Recovered entity by placing it back at ${start}`);
            }

            return Promise.reject(error);
        }
    }

    public createEntityGraphics(modelId: string, playerId: PlayerID): EntityGraphics {
        this.logger.info(`Creating entity graphics for player ${playerId} with model ${modelId}`);
        const model = getModelTemplateByID(modelId);
        assert(model, `Model name: "${modelId}" not found.`);

        const entityG = new EntityGraphics(model);
        this.tupleManager.associateEntityWithPlayer(entityG, playerId);
        return entityG;
    }
}