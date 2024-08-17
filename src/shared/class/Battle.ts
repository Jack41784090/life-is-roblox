import { ReplicatedStorage, RunService, UserInputService, Workspace } from "@rbxts/services";
import { getDummyStats, getTween } from "shared/func";
import { BattleConfig, BotType, ReadinessIcon } from "shared/types/battle-types";
import BattleGUI from "./BattleGui";
import Entity from "./Entity";
import Grid from "./Grid";

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
    openBattleGUIEvent: BindableEvent = ReplicatedStorage.WaitForChild("OpenBattleGUI") as BindableEvent;
    updateBattleGUIEvent: BindableEvent = ReplicatedStorage.WaitForChild("UpdateBattleGUI") as BindableEvent;
    gui: BattleGUI | undefined;

    // Camera-Related Information
    camera: Camera;
    panService: RBXScriptConnection | undefined;
    grid: Grid;

    // Entity-Related Information
    teams: BattleTeam[] = [];
    totalEnemyCount: number = 0;
    enemyCount: number = 0;
    playerCount: number = 0;

    gridMin: Vector2;
    gridMax: Vector2;
    panSpeed = 0.6;

    // Timeslotting
    time: number = -1;

    static Create(config: BattleConfig) {
        const b = new Battle(config.center, config.size, config.width, config.height, config.camera);

        // Set up the camera
        b.initializeCamera(config.camera, config.center.X, config.size, config.center.Y);

        // Set up the grid
        b.initializeGrid();

        // init players and teams
        b.initializeTeams(config.teamMap);

        // set up gui
        b.gui = BattleGUI.Start(b.getReadinessIcons());

        // Spawn the entities
        b.spawn();
        b.begin();

        return b;
    }

    private constructor(center: Vector2, size: number, width: number, height: number, camera: Camera) {
        const camera_centerx = math.floor(center.X) * size;
        const camera_centery = math.floor(center.Y) * size;
        this.gridMin = new Vector2(camera_centerx - (width * size) / 2, camera_centery - (height * size) / 2);
        this.gridMax = new Vector2(camera_centerx + (width * size) / 2, camera_centery + (height * size) / 2);
        this.camera = camera;

        this.grid = new Grid(new Vector2(width, height), center, size);
    }

    //#region Initialization
    private initializeGrid() {
        this.grid.materialise();
    }

    private initializeCamera(camera: Camera, centerx: number, size: number, centery: number) {
        print(`Grid Min: ${this.gridMin}, Grid Max: ${this.gridMax}`);
        const camera_centerx = math.floor(centerx) * size;
        const camera_centery = math.floor(centery) * size;
        this.camera = camera;
        this.setCameraCFrame(
            new Vector3(camera_centerx, size * 5, camera_centery),
            new Vector3(camera_centerx, 0, camera_centery))
            .await();
        this.setUpCameraPan();
    }

    private initializePlayer(player: Player) {
        const entity = new Entity({
            playerID: player.UserId,
            stats: getDummyStats(),
            pos: 0,
            org: 0,
            hip: 0,
            name: player.Name,
            botType: BotType.Player,
        });
        print(`Initialized ${entity.name}`);
        return entity;
    }

    private initializeTeams(teamMap: Record<string, Player[]>) {
        for (const [teamName, playerList] of pairs(teamMap)) {
            const members = playerList.map(player => {
                const entity = new Entity({
                    playerID: player.UserId,
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


    //#region Camera Work
    static readonly EDGE_BUFFER = 0.15;
    private setUpCameraPan() {
        print('Setting up camera pan');
        this.panService = RunService.RenderStepped.Connect(() => {
            const mousePosition = UserInputService.GetMouseLocation();
            const screenSize = this.camera.ViewportSize;

            let gridDelta = new Vector2(0, 0);

            const edgeBuffer_x = screenSize.X * Battle.EDGE_BUFFER;
            // Check if the mouse is near the left or right edge of the screen
            if (mousePosition.X < edgeBuffer_x) {
                gridDelta = gridDelta.add(new Vector2(-1, 0));
            } else if (mousePosition.X > screenSize.X - edgeBuffer_x) {
                gridDelta = gridDelta.add(new Vector2(1, 0));
            }

            const edgeBuffer_y = screenSize.Y * Battle.EDGE_BUFFER;
            // Check if the mouse is near the top or bottom edge of the screen
            if (mousePosition.Y < edgeBuffer_y) {
                gridDelta = gridDelta.add(new Vector2(0, 1));
            } else if (mousePosition.Y > screenSize.Y - edgeBuffer_y) {
                gridDelta = gridDelta.add(new Vector2(0, -1));
            }

            // print(gridDelta);

            // Update the camera position based on the calculated delta
            this.updateCameraPosition(gridDelta);
        });
    }
    private updateCameraPosition(gridDelta: Vector2) {
        // WARNING: grid x = camera z, grid y = camera x
        const camera = Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }

        const cameraCFrame = camera.CFrame;
        const cameraPosition = cameraCFrame.Position.add(new Vector3(gridDelta.Y * this.panSpeed, 0, gridDelta.X * this.panSpeed));

        // Ensure the camera stays within the grid bounds
        const clampedX = math.clamp(cameraPosition.X, this.gridMin.Y, this.gridMax.Y);
        const clampedZ = math.clamp(cameraPosition.Z, this.gridMin.X, this.gridMax.X);

        camera.CFrame = new CFrame(
            new Vector3(clampedX, cameraPosition.Y, clampedZ),
            cameraCFrame.LookVector.add(new Vector3(clampedX, 0, clampedZ)));
    }
    private setCameraCFrame(pos: Vector3, lookAt: Vector3, camera?: Camera) {
        print(`Setting camera CFrame to ${pos}, looking at ${lookAt}`);
        const cam = camera ?? this.camera;
        const lookAT = new CFrame(pos, lookAt);
        cam.CameraType = Enum.CameraType.Scriptable;
        const tween = getTween(
            cam,
            new TweenInfo(0.5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: lookAT });
        return new Promise((resolve) => {
            tween.Play();
            tween.Completed.Connect(() => {
                resolve(void 0)
            });
        });
    }
    //#endregion

    private spawn() {
        for (const team of this.teams) {
            for (const entity of team.members) {
                const cell = entity.cell ?? this.grid.cells[math.random(0, this.grid.cells.size() - 1)];
                entity.setCell(cell);
                print(`Spawning ${entity.name}[${team.name}] at ${entity.cell?.xy.X}, ${entity.cell?.xy.Y}`)
                entity.materialise();
            }
        }
    }

    public begin() {
        print('【Begin】')
        if (this.time === -1) this.round();
    }

    private advanceTime() {
        this.time++;
        print(`【Time】 ${this.time}`)
    }

    private async round() {
        this.advanceTime();
        const w = this.runReadinessGauntlet();
        print(`Winner: ${w?.name}`);
        print(w);

        print('【Round Finish】');
        // wait(1);
        // this.round();
    }

    //#region Readiness Management
    private getReadinessIcons() {
        const characterIcons: ReadinessIcon[] = [];
        for (const team of this.teams) {
            for (const entity of team.members) {
                // if (!entity.iconURL) continue;
                // characterIcons.push(entity.iconURL);
                characterIcons.push({
                    iconUrl: "rbxassetid://183747117",
                    readiness: entity.pos / 100
                });
            }
        }
        return characterIcons;
    }
    calculateReadinessIncrement(entity: Entity) {
        const y = entity.stats.spd;
        return y - math.random() * 0.1 * y + math.random() * 0.1 * y;
    }
    runReadinessGauntlet() {
        print('【Run Readiness Gauntlet】');
        const entities = this.teams.map(team => team.members).reduce<Entity[]>(
            (acc, val) => [...acc, ...val], []);

        print(entities);
        if (entities.size() === 0) return;
        if (entities.size() === 1) return entities[0];


        let i = 0
        while (entities.sort((a, b) => a.pos - b.pos > 0)[0].pos < 100) {
            this._gauntletIterate(entities);
            i++;
            if (i++ > 10000) break;
        }

        this.gui?.tweenToUpdate(this.getReadinessIcons());

        const winner = entities.sort((a, b) => a.pos - b.pos > 0)[0];
        return winner;
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
