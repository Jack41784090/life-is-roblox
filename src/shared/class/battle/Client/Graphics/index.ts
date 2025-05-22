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
    private logger = Logger.createContextLogger("Graphics");
    private idTupleMap: Map<PlayerID, EntityCellGraphicsTuple> = new Map();
    private tupleQR: QR<EntityCellGraphicsTuple>;
    private height: number;
    private size: number;
    private grid: HexGrid;

    // Centralized tracking of entity IDs to player IDs
    private entityToPlayerIdMap: Map<EntityGraphics, PlayerID> = new Map();

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
        // Update idTupleMap
        this.idTupleMap.set(playerID, tuple);

        // Update tupleQR, ensuring it's consistent
        if (this.tupleQR.get(tuple.cellGraphics.qrs)) {
            this.logger.warn(`Tuple already exists at ${tuple.cellGraphics.qrs}, replacing it`);
            const existingTuple = this.tupleQR.get(tuple.cellGraphics.qrs)!;

            // If the existing tuple has entity graphics, we need to remove its mapping
            if (existingTuple.entityGraphics) {
                this.entityToPlayerIdMap.delete(existingTuple.entityGraphics);
            }
        }

        this.tupleQR.set(tuple.cellGraphics.qrs, tuple);

        // Update entity to player ID mapping if this tuple has entity graphics
        if (tuple.entityGraphics) {
            this.entityToPlayerIdMap.set(tuple.entityGraphics, playerID);
        }

        this.logger.info(`Added tuple for player ${playerID} at ${tuple.cellGraphics.qrs}`);
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

        if (!tuple) {
            this.logger.warn(`No tuple found to remove at position ${qr}`);
            return;
        }

        if (tuple.entityGraphics) {
            // Clean up entity to player ID mapping
            this.entityToPlayerIdMap.delete(tuple.entityGraphics);

            // Remove from idTupleMap
            this.idTupleMap.forEach((t, playerID) => {
                if (t === tuple) {
                    this.idTupleMap.delete(playerID);
                    this.logger.info(`Removed player ${playerID} tuple mapping`);
                }
            });
        }

        this.tupleQR.delete(tuple.cellGraphics.qrs);
        this.logger.info(`Removed tuple at position ${tuple.cellGraphics.qrs}`);
    }

    public findTupleByEntity(entity: Entity) {
        this.logger.debug(this.tupleQR, 'by', entity.qr);
        return this.tupleQR.get(entity.qr);
    }

    public findEntityG(playerID: PlayerID): EntityGraphics | undefined;
    public findEntityG(entity: Entity): EntityGraphics | undefined;
    public findEntityG(qr: Vector2): EntityGraphics | undefined;
    public findEntityG(qrs: Vector3): EntityGraphics | undefined;
    public findEntityG(qr: Vector2 | Vector3 | Entity | PlayerID): EntityGraphics | undefined {
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

        if (!tuple) {
            this.logger.debug(`No tuple found for query: ${qr}`);
            return undefined;
        }

        if (!tuple.entityGraphics) {
            this.logger.debug(`Tuple found but no entity graphics for: ${qr}`);
        }

        return tuple.entityGraphics;
    }

    public findCellG(qr: Vector2): HexCellGraphics | undefined;
    public findCellG(qrs: Vector3): HexCellGraphics | undefined;
    public findCellG(dest: Vector2 | Vector3): HexCellGraphics | undefined {
        const tuple = this.tupleQR.get(dest as Vector2);
        if (!tuple) {
            this.logger.debug(`No tuple found for cell at: ${dest}`);
            return undefined;
        }
        return tuple.cellGraphics;
    }

    public findEntityGByEntity(entity: Entity): EntityGraphics | undefined {
        const tuple = this.findTupleByEntity(entity);
        if (!tuple) {
            this.logger.debug(`No tuple found for entity: ${entity.playerID}`);
            return undefined;
        }

        if (!tuple.entityGraphics) {
            this.logger.debug(`Tuple found but no entity graphics for entity: ${entity.playerID}`);
        }

        return tuple.entityGraphics;
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
        syncs.push(this.syncGrid(stateState.grid), this.syncTeams(stateState.teams));

        // After syncing, ensure our maps are consistent
        this.syncMaps();

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
        const newEntityG = this.createEntityGraphics(modelID, entityState.playerID);
        const newTuple = this.positionTuple(qr);
        newTuple.couple(newEntityG);
        this.idTupleMap.set(entityState.playerID, newTuple);
        this.tupleQR.set(qr, newTuple);
        this.logger.info(`Player ${entityState.playerID} positioned at ${qr}`);
    }

    public repositionPlayer(playerID: PlayerID, newQR: Vector2) {
        this.logger.info(`Repositioning player ${playerID} to ${newQR}`);
        const playerTuple = this.idTupleMap.get(playerID);
        if (!playerTuple) {
            this.logger.warn(`Player tuple not found for ${playerID}`);
            return;
        }

        // Get the entity graphics and remove old tuple
        const oldQR = playerTuple.cellGraphics.qr;
        const entity = playerTuple.decouple()!;
        this.tupleQR.delete(oldQR);

        // Create new tuple and update maps
        const newTuple = this.positionTuple(newQR);
        newTuple.couple(entity);

        // Update both maps
        this.idTupleMap.set(playerID, newTuple);
        this.tupleQR.set(newQR, newTuple);

        // Update entity-player mapping
        this.entityToPlayerIdMap.set(entity, playerID);

        this.logger.info(`Player ${playerID} repositioned from ${oldQR} to ${newQR}`);
    }

    public async moveEntity(start: Vector2, dest: Vector2) {
        this.logger.info(`Moving entity from ${start} to ${dest}`);
        const tuple = this.tupleQR.get(start);
        const entity = tuple?.decouple();
        if (!entity) {
            this.logger.warn(`Entity not found at ${start}`);
            return Promise.reject(`Entity not found at ${start}`);
        }

        // Use the dedicated method to get player ID
        const playerID = this.getPlayerIDFromEntityG(entity);

        entity.model.Parent = Workspace;
        const destinationCell = this.tupleQR.get(dest)?.cellGraphics ?? this.positionTuple(dest).cellGraphics;

        const path = (new Pathfinding({ grid: this.grid.info(), dest, start, })).begin()
        await entity.moveToCell(destinationCell, path.mapFiltered(p => this.tupleQR.get(p)?.cellGraphics));

        const newTuple = new EntityCellGraphicsTuple(destinationCell, entity);
        this.tupleQR.set(dest, newTuple);

        // Update idTupleMap if we found the player ID
        if (playerID) {
            this.idTupleMap.set(playerID, newTuple);
            this.logger.info(`Updated player ${playerID} position to ${dest}`);
        } else {
            this.logger.warn(`Could not find player ID for entity at ${start}, maps may be inconsistent`);
        }

        return Promise.resolve();
    }

    public createEntityGraphics(modelId: string, playerId: PlayerID): EntityGraphics {
        this.logger.info(`Creating entity graphics for player ${playerId} with model ${modelId}`);
        const model = getModelTemplateByID(modelId);
        assert(model, `Model name: "${modelId}" not found.`);

        const entityG = new EntityGraphics(model);
        this.entityToPlayerIdMap.set(entityG, playerId);
        return entityG;
    }

    public validateMaps(): { isConsistent: boolean, issues: string[] } {
        const issues: string[] = [];

        // Check that every entity in idTupleMap has a corresponding tuple in tupleQR
        this.idTupleMap.forEach((tuple, playerId) => {
            const qr = tuple.cellGraphics.qr;
            const tupleAtPosition = this.tupleQR.get(qr);

            if (!tupleAtPosition) {
                issues.push(`Player ${playerId} has a tuple in idTupleMap but no corresponding tuple in tupleQR at position ${qr}`);
            } else if (tupleAtPosition !== tuple) {
                issues.push(`Player ${playerId} tuple mismatch: different tuples in idTupleMap and tupleQR at position ${qr}`);
            }

            if (tuple.entityGraphics) {
                const mappedPlayerId = this.entityToPlayerIdMap.get(tuple.entityGraphics);
                if (!mappedPlayerId) {
                    issues.push(`Player ${playerId} has entity graphics not tracked in entityToPlayerIdMap`);
                } else if (mappedPlayerId !== playerId) {
                    issues.push(`Player ${playerId} maps to different playerID ${mappedPlayerId} in entityToPlayerIdMap`);
                }
            }
        });

        // Check for entityGraphics that exist in tupleQR but not in idTupleMap
        this.tupleQR.values().forEach(tuple => {
            if (tuple.entityGraphics) {
                let foundInIdMap = false;
                this.idTupleMap.forEach((idTuple) => {
                    if (idTuple === tuple) {
                        foundInIdMap = true;
                    }
                });

                if (!foundInIdMap) {
                    issues.push(`Tuple at ${tuple.cellGraphics.qr} has entity graphics but isn't tracked in idTupleMap`);
                }

                const mappedPlayerId = this.entityToPlayerIdMap.get(tuple.entityGraphics);
                if (!mappedPlayerId) {
                    issues.push(`Entity graphics at ${tuple.cellGraphics.qr} not tracked in entityToPlayerIdMap`);
                }
            }
        });

        return {
            isConsistent: issues.size() === 0,
            issues
        };
    }

    public syncMaps(): void {
        this.logger.info("Syncing entity-player ID mappings");

        // Clear the entity to player ID map and rebuild it
        this.entityToPlayerIdMap.clear();

        // Update from idTupleMap
        this.idTupleMap.forEach((tuple, playerID) => {
            if (tuple.entityGraphics) {
                this.entityToPlayerIdMap.set(tuple.entityGraphics, playerID);
            }
        });

        // Check for inconsistencies in tupleQR
        this.tupleQR.values().forEach(tuple => {
            if (tuple.entityGraphics) {
                let playerID: PlayerID | undefined;

                // Find the associated player ID
                this.idTupleMap.forEach((idTuple, id) => {
                    if (idTuple === tuple) {
                        playerID = id;
                    }
                });

                // If found, update entity map
                if (playerID !== undefined && !this.entityToPlayerIdMap.has(tuple.entityGraphics)) {
                    this.entityToPlayerIdMap.set(tuple.entityGraphics, playerID);
                    this.logger.info(`Added missing entity mapping for player ${playerID}`);
                }
            }
        });
    }

    public getPlayerIDFromEntityG(entityG: EntityGraphics): PlayerID | undefined {
        // First try direct lookup from our map
        const playerID = this.entityToPlayerIdMap.get(entityG);
        if (playerID !== undefined) {
            return playerID;
        }

        // Fallback: search through idTupleMap
        let foundID: PlayerID | undefined;
        this.idTupleMap.forEach((tuple, id) => {
            if (tuple.entityGraphics === entityG) {
                foundID = id;
            }
        });

        // If found in idTupleMap but not in entityToPlayerIdMap, update the mapping
        if (foundID !== undefined) {
            this.entityToPlayerIdMap.set(entityG, foundID);
        }

        return foundID;
    }
}