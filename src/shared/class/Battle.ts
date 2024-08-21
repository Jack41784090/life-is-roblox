import Roact from "@rbxts/roact";
import { ReplicatedStorage, RunService, UserInputService, Workspace } from "@rbxts/services";
import { getDummyStats, getTween, gridXYToWorldXY } from "shared/func";
import { ActionType, BattleConfig, BotType, EntityActionOptions, ReadinessIcon } from "shared/types/battle-types";
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

    //
    currentRoundEntity: Entity | undefined;

    // Camera-Related Information
    center: Vector2;
    size: number;
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
        b.initializeCamera();

        // Set up the grid
        b.initializeGrid();

        // init players and teams
        b.initializeTeams(config.teamMap);

        // set up gui
        b.gui = BattleGUI.Start(b);

        // Spawn the entities
        b.spawn();
        b.begin();

        return b;
    }

    private constructor(center: Vector2, size: number, width: number, height: number, camera: Camera) {
        const camera_centerx = math.floor(center.X) * size;
        const camera_centery = math.floor(center.Y) * size;
        this.center = center;
        this.size = size;
        this.gridMin = new Vector2(camera_centerx - (width * size) / 2, camera_centery - (height * size) / 2);
        this.gridMax = new Vector2(camera_centerx + (width * size) / 2, camera_centery + (height * size) / 2);
        this.camera = camera;

        this.grid = new Grid(new Vector2(width, height), center, size);
    }

    //#region Initialization
    private initializeGrid() {
        this.grid.materialise();
    }

    private initializeCamera(camera?: Camera) {
        this.setCameraToHOI4(camera);
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

    private detectEdgeMovement(): Vector2 {
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
        return gridDelta;

    }

    private setCameraToHOI4(camera?: Camera, gridFocal?: Vector2) {
        print(`Grid Min: ${this.gridMin}, Grid Max: ${this.gridMax}`);
        const center = gridFocal ?
            new Vector2(gridXYToWorldXY(gridFocal, this.grid).X, gridXYToWorldXY(gridFocal, this.grid).Z) :
            new Vector2(math.floor(this.center.X) * this.size, math.floor(this.center.Y) * this.size);
        if (camera) this.camera = camera;
        this.setUpHOI4CameraPan();
        return this.setCameraCFrame(
            new Vector3(center.X, this.size * 5, center.Y),
            new Vector3(center.X, 0, center.Y))
    }
    private setUpHOI4CameraPan() {
        print('Setting up HOI4 Camera Pan');
        this.panService?.Disconnect();
        this.panService = RunService.RenderStepped.Connect(() => {
            // Update the camera position based on the calculated delta
            this.updateHOI4CameraPosition(this.detectEdgeMovement());
        });
    }
    private setCameraToLookAtModel(model: Model) {
        this.panService?.Disconnect();
        return this.goToModelCam(model).then(() => {
            // this.setUpCharCenterCameraPan(model);
        });
    }
    private setUpCharCenterCameraPan(model: Model) {
        print('Setting up Character Center Camera Pan');
        this.panService?.Disconnect();
        const distance = 20;

        // Define the rotation speed in radians per second
        const rotationSpeed = math.rad(30); // 30 degrees per second
        const camera = this.camera ?? Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }
        const camOriPart = model.WaitForChild("cam-ori") as BasePart;

        this.panService = RunService.RenderStepped.Connect((deltaTime) => {
            // Calculate the current angle based on time
            const angle = tick() * rotationSpeed;

            // Calculate the rotation around the Y-axis
            const rotation = CFrame.Angles(0, angle, 0);

            // Apply the rotation to the cam-ori's CFrame, offset by the desired distance
            const cameraCFrame = camOriPart.CFrame.mul(rotation);

            // Set the camera's CFrame to the calculated position, looking at cam-ori's position
            camera.CFrame = CFrame.lookAt(cameraCFrame.Position, camOriPart.Position);
        });
    }
    private updateHOI4CameraPosition(gridDelta: Vector2) {
        // WARNING: grid x = camera z, grid y = camera x
        const camera = this.camera ?? Workspace.CurrentCamera;
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
    private goToModelCam(model: Model) {
        const cam_ori = model.WaitForChild("cam-ori") as BasePart;
        const tween = getTween(
            this.camera,
            new TweenInfo(0.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut),
            { CFrame: cam_ori.CFrame });
        tween.Play();
        return new Promise((resolve) => {
            tween.Completed.Connect(() => {
                resolve(void 0)
            });
        });
    }
    //#endregion


    //#region 
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
        print(`【Time】 ${this.time + 1}`)
        return this.time++;
    }

    private async round() {
        const time = this.advanceTime();
        const w = await this.runReadinessGauntlet();
        this.currentRoundEntity = w;
        const model = w?.model;
        if (!model) {
            await this.setCameraToHOI4();
            this.round();
            return;
        }

        await this.setCameraToLookAtModel(model)

        await new Promise((resolve) => {
            this.gui?.showEntityActionOptions(w, (op: EntityActionOptions) => {
                const action = op.type;
                switch (action) {
                    case ActionType.Move:
                        // this.gui
                        break;
                    default:
                        break;
                }
                Roact.unmount(op.ui);
                this.setCameraToHOI4(this.camera, w.cell?.xy);
                // this.setCameraToHOI4().then(resolve);
            })
        })

        if (w) w.pos /= 2;
        await this.gui?.tweenToUpdateReadiness();

        this.currentRoundEntity = undefined;
        print('【Round Finish】');
        wait(1);
        this.round();
    }
    //#endregion


    //#region Readiness Management
    getReadinessIcons() {
        const characterIcons: ReadinessIcon[] = [];
        for (const team of this.teams) {
            for (const entity of team.members) {
                // if (!entity.iconURL) continue;
                // characterIcons.push(entity.iconURL);
                characterIcons.push({
                    iconUrl: "rbxassetid://18915919565",
                    readiness: entity.pos / 100
                });
            }
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

        print(entities);
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
