import Roact from "@rbxts/roact";
import { ReplicatedStorage } from "@rbxts/services";
import { MOVEMENT_COST } from "shared/const";
import { getDummyStats } from "shared/func";
import { ActionType, BattleConfig, BotType, EntityStatus, ReadinessIcon } from "shared/types/battle-types";
import BattleCamera from "./BattleCamera";
import BattleGUI from "./BattleGui";
import Cell from "./Cell";
import Entity from "./Entity";
import Grid from "./Grid";
import Pathfinding from "./Pathfinding";

export class BattleTeam {
    name: string;
    members: Entity[];
    constructor(name: string, members: Entity[]) {
        this.members = members;
        this.name = name;
    }
    push(...members: Entity[]) {
        for (const member of members) {
            const exist = this.members.find(m => m.stats.id === member.stats.id);
            if (!exist) {
                this.members.push(member);
            }
        }
    }
}

export class Battle {
    bcamera: BattleCamera;

    openBattleGUIEvent: BindableEvent = ReplicatedStorage.WaitForChild("OpenBattleGUI") as BindableEvent;
    updateBattleGUIEvent: BindableEvent = ReplicatedStorage.WaitForChild("UpdateBattleGUI") as BindableEvent;
    gui: BattleGUI | undefined;

    //
    currentRound: {
        entity?: Entity,
        endRoundResolve?: (value: unknown) => void,
    } | undefined;

    // Entity-Related Information
    teams: BattleTeam[] = [];
    totalEnemyCount: number = 0;
    enemyCount: number = 0;
    playerCount: number = 0;

    grid: Grid;
    gridMin: Vector2;
    gridMax: Vector2;

    // Timeslotting
    time: number = -1;

    static Create(config: BattleConfig) {
        const b = new Battle(config.center, config.size, config.width, config.height, config.camera);

        // Set up the camera
        b.initializeCamera();

        // Set up the grid
        b.initializeGrid();

        // init players and teams
        b.initializeTeams(config.teamMap);

        // set up gui
        b.gui = BattleGUI.Start(b);

        // Spawn the entities
        b.begin();

        return b;
    }

    private constructor(center: Vector2, size: number, width: number, height: number, camera: Camera) {
        const camera_centerx = math.floor(center.X) * size;
        const camera_centery = math.floor(center.Y) * size;
        this.gridMin = new Vector2(camera_centerx - (width * size) / 2, camera_centery - (height * size) / 2);
        this.gridMax = new Vector2(camera_centerx + (width * size) / 2, camera_centery + (height * size) / 2);
        this.bcamera = new BattleCamera(center, size, camera, this);
        this.grid = new Grid(new Vector2(width, height), center, size);
    }

    //#region Initialization
    private initializeGrid() {
        this.grid.materialise();
    }

    private initializeCamera() {
        this.bcamera.enterHOI4Mode();
    }

    private initializeTeams(teamMap: Record<string, Player[]>) {
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList.map(player => {
                const entity = new Entity({
                    playerID: player.UserId + math.random(0, 1000),
                    stats: getDummyStats(),
                    pos: 0,
                    org: 0,
                    hip: 0,
                    name: player.Name,
                    team: teamName,
                    botType: player.UserId === 0 ? BotType.Enemy : undefined,
                });
                return entity;
            });
            this.teams.push(new BattleTeam(teamName, members));
        }
    }
    //#endregion


    //#region
    getAllEntities() {
        return this.teams.map(team => team.members).reduce<Entity[]>((acc, val) => [...acc, ...val], []);
    }

    private spawn() {
        for (const team of this.teams) {
            for (const entity of team.members) {
                let randomCell: Cell = this.grid.cells[math.random(0, this.grid.cells.size() - 1)];
                while (randomCell.entity) randomCell = this.grid.cells[math.random(0, this.grid.cells.size() - 1)];

                if (!entity.cell) {
                    entity.setCell(randomCell);
                }
                entity.materialise();

                print(`Spawning ${entity.name}[${team.name}] at ${entity.cell?.xy.X}, ${entity.cell?.xy.Y}`)
            }
        }
    }

    public begin() {
        print('【Begin】')
        if (this.time === -1) {
            this.spawn();
            this.round();
        };
    }

    private advanceTime() {
        print(`【Time】 ${this.time + 1}`)
        return this.time++;
    }

    private async round() {
        const time = this.advanceTime();

        // Run the readiness gauntlet and get the next model to act
        const w = await this.runReadinessGauntlet();
        if (!w) {
            this.resetCameraAndRestartRound();
            return;
        }

        this.currentRound = {
            entity: w,
            endRoundResolve: () => { },
        };

        // Focus the camera on the model
        await this.bcamera.enterCharacterCenterMode();

        // Handle the current round's actions
        const chosenActions = await this.waitForRoundActions(w);

        // Update readiness and finalize the round
        if (w) {
            w.pos /= 2;
        }

        this.finalizeRound();
        this.round(); // Start the next round
    }

    private async resetCameraAndRestartRound() {
        await this.bcamera.enterHOI4Mode();
        this.round(); // Restart the round
    }

    private async waitForRoundActions(w: Entity) {
        return new Promise((resolve) => {
            (this.currentRound ?? (this.currentRound = {})).endRoundResolve = resolve;
            this.gui?.showEntityActionOptions(w);
            w.playAudio(EntityStatus.idle);
        });
    }

    getActions(e: Entity) {
        return [
            {
                type: ActionType.Move,
                run: (tree: Roact.Tree) => {
                    Roact.unmount(tree);
                    this.gui?.enterMovement();
                },
            },
        ];
    }

    async moveEntity(entity: Entity, cell: Cell, _path?: Vector2[]) {
        const lim = math.floor(entity.pos / MOVEMENT_COST);
        const path = _path ?? Pathfinding.Start({
            grid: this.grid,
            start: entity.cell?.xy ?? new Vector2(0, 0),
            dest: cell.xy,
            limit: lim,
        }).fullPath;
        if (path.size() === 0) {
            warn(`No path found from ${entity.cell?.xy.X}, ${entity.cell?.xy.Y} to ${cell.xy.X}, ${cell.xy.Y}`);
            return;
        }

        const adjacentCell = this.grid.getCell(path[path.size() - 1]);
        let destination: Cell = cell;
        if (cell.isVacant() === false) {
            warn(`Cell ${cell.xy.X}, ${cell.xy.Y} is not vacant`);
            if (adjacentCell.isVacant()) {
                destination = adjacentCell;
            }
            else {
                warn(`Adjacent cell ${adjacentCell.xy.X}, ${adjacentCell.xy.Y} is not vacant`);
                return;
            }
        }

        this.gui?.glowAlongPath(path);
        return entity.moveToCell(destination, path)
    }

    private finalizeRound() {
        this.currentRound = undefined;
        print('【Round Finish】');
        wait(1);
    }

    getEntityFromModel(model: Model) {
        return this.getAllEntities().find(e => e.model === model);
    }

    //#endregion


    //#region Readiness Management
    static readonly MOVEMENT_COST = 10;

    getReadinessIcons(): ReadinessIcon[] {
        const characterIcons: ReadinessIcon[] = [];

        for (const e of this.getAllEntities()) {
            characterIcons.push({
                iconID: e.playerID,
                iconUrl: "rbxassetid://18915919565",
                readiness: e.pos / 100
            });
        }

        return characterIcons;
    }
    calculateReadinessIncrement(entity: Entity) {
        // const y = entity.stats.spd;
        const y = math.random(0, 10);
        const r = - math.random() * 0.1 * y + math.random() * 0.1 * y;
        return y + r;
    }
    runReadinessGauntlet() {
        print('【Run Readiness Gauntlet】');
        const entities = this.teams.map(team => team.members).reduce<Entity[]>(
            (acc, val) => [...acc, ...val], []);

        if (entities.size() === 0) return;

        let i = 0
        while (entities.sort((a, b) => a.pos - b.pos > 0)[0].pos < 100) {
            this._gauntletIterate(entities);
            i++;
            if (i++ > 10000) break;
        }

        const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
        return this.gui?.tweenToUpdateReadiness()?.then(() => winner);
    }
    private _gauntletIterate(entities: Entity[]) {
        for (const entity of entities) {
            entity.pos += this.calculateReadinessIncrement(entity);
            if (entity.pos >= 100) {
                entity.pos = 100;
                // this.onEntityReady(entity);
            }
        }
    }
    //#endregion
}
