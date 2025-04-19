import { PathfindingService, Workspace } from "@rbxts/services";
import Logger from "shared/utils/Logger";
import { GoingConfig } from "./types";

export default class Going {
    protected logger = Logger.createContextLogger("Going");
    protected currentDestination: Vector3;
    protected blockedHandle?: RBXScriptConnection;
    protected characterModel: Model;
    protected wayPoints: Array<PathWaypoint> = [];
    public calculatingPath = false;
    public isCalculated = false;
    private path?: Path;

    constructor(config: GoingConfig) {

        this.currentDestination = config.destination;
        this.characterModel = config.characterModel;
    }

    public calculatePath() {
        if (this.calculatingPath) return;
        this.calculatingPath = true;
        // print(`[Going] Calculating path to ${this.currentDestination}`);
        this.path = PathfindingService.CreatePath({
            AgentRadius: 2,
            AgentHeight: 5,
            AgentCanJump: false,
        })

        const [success, err] = pcall(() => {
            this.path!.ComputeAsync(this.characterModel.PrimaryPart!.Position, this.currentDestination!);
        })
        if (success && this.path.Status === Enum.PathStatus.Success) {
            this.logger.debug(`Path calculated`, this.path.GetWaypoints());

            this.isCalculated = true;
            this.calculatingPath = false;
            const waypoints = this.path.GetWaypoints();
            this.wayPoints = waypoints
            this.blockedHandle = this.path.Blocked.Connect((blockedWaypointIndex) => {
                this.logger.warn(`[Going] Blocked at waypoint ${blockedWaypointIndex}`);
                this.destroy();
                this.calculatePath();
            })
        }
        else if (err) {
            this.logger.warn(err);
        }
    }

    public nextWaypoint(debug = true) {
        const nextWaypoint = this.wayPoints.shift();
        // print(`[Going] Next waypoint: ${nextWaypoint}`);
        if (debug && nextWaypoint) {
            this.createDebugWaypoint(nextWaypoint);
        }
        return nextWaypoint;
    }


    public destroy() {
        // print('[Going] Destroying path');
        this.blockedHandle?.Disconnect();
        this.path?.Destroy();
        this.wayPoints = [];
    }

    private goingColor = new Color3(math.random(), math.random(), math.random());
    private createDebugWaypoint(waypoint: PathWaypoint) {
        const part = new Instance('Part');
        part.Size = new Vector3(1, 1, 1);
        part.Position = waypoint.Position;
        part.Anchored = true;
        part.Parent = Workspace;

        part.BrickColor = new BrickColor(this.goingColor);
        part.Transparency = 0.5;
        part.CanCollide = false;
        part.Material = Enum.Material.Neon;

        const sc = part.Touched.Connect((touchingPart) => {
            if (touchingPart.Parent === this.characterModel) {
                part.Destroy();
                sc.Disconnect();
            }
        })
    }
}