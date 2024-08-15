import { RunService, UserInputService, Workspace } from "@rbxts/services";
import { getDummyStats, getTween } from "shared/func";
import { BattleConfig, BotType } from "shared/types/battle-types";
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

    constructor(config: BattleConfig) {
        const { width, height, camera, center, size } = config;

        // Set up the camera
        const camera_centerx = math.floor(center.X) * size;
        const camera_centery = math.floor(center.Y) * size;
        this.gridMin = new Vector2(camera_centerx - (width * size) / 2, camera_centery - (height * size) / 2);
        this.gridMax = new Vector2(camera_centerx + (width * size) / 2, camera_centery + (height * size) / 2);
        print(`Grid Min: ${this.gridMin}, Grid Max: ${this.gridMax}`);
        this.camera = camera;
        this.setCameraCFrame(
            new Vector3(camera_centerx, size * 5, camera_centery),
            new Vector3(camera_centerx, 0, camera_centery)).then(() => {
                this.setUpCameraPan();
            });

        // Set up the grid
        this.grid = new Grid(new Vector2(width, height), center, size);
        this.grid.materialise()

        // Set up the teams
        for (const [teamName, playerList] of pairs(config.teamMap)) {
            const members = playerList.map(player => {
                const entity = new Entity({
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

    static readonly EDGE_BUFFER = 0.15;
    private setUpCameraPan() {
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

            print(gridDelta);

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

    spawn() {
        for (const team of this.teams) {
            for (const entity of team.members) {
                const cell = entity.cell ?? this.grid.cells[math.random(0, this.grid.cells.size() - 1)];
                entity.setCell(cell);
                print(`Spawning ${entity.name} at ${entity.cell?.xy.X}, ${entity.cell?.xy.Y}`)

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
        wait(1);
        this.round();
    }
}
