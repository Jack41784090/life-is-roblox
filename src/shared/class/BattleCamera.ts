import { RunService, UserInputService, Workspace } from "@rbxts/services";
import { getTween, gridXYToWorldXY } from "shared/func";
import { Battle } from "./Battle";

export default class BattleCamera {
    battle: Battle;

    // Camera-Related Information
    HOI4PanSpeed = 0.6;
    angle = 0;
    center: Vector2;
    size: number;
    camera: Camera;
    panService: RBXScriptConnection | undefined;

    constructor(center: Vector2, size: number, camera: Camera, battle: Battle) {
        this.center = center;
        this.size = size;
        this.camera = camera;
        this.battle = battle;
    }

    //#region Camera Work
    static readonly EDGE_BUFFER = 0.15;

    private detectEdgeMovement(): Vector2 {
        const mousePosition = UserInputService.GetMouseLocation();
        const screenSize = this.camera.ViewportSize;

        let gridDelta = new Vector2(0, 0);

        const edgeBuffer_x = screenSize.X * BattleCamera.EDGE_BUFFER;
        if (mousePosition.X < edgeBuffer_x) {
            const percentage = 1 - math.clamp(mousePosition.X / edgeBuffer_x, 0, 1);
            gridDelta = gridDelta.add(new Vector2(-percentage, 0));
        } else if (mousePosition.X > screenSize.X - edgeBuffer_x) {
            const percentage = 1 - math.clamp((screenSize.X - mousePosition.X) / edgeBuffer_x, 0, 1);
            gridDelta = gridDelta.add(new Vector2(percentage, 0));
        }

        const edgeBuffer_y = screenSize.Y * BattleCamera.EDGE_BUFFER;
        if (mousePosition.Y < edgeBuffer_y) {
            const percentage = 1 - math.clamp(mousePosition.Y / edgeBuffer_y, 0, 1);
            gridDelta = gridDelta.add(new Vector2(0, percentage));
        } else if (mousePosition.Y > screenSize.Y - edgeBuffer_y) {
            const percentage = 1 - math.clamp((screenSize.Y - mousePosition.Y) / edgeBuffer_y, 0, 1);
            gridDelta = gridDelta.add(new Vector2(0, -percentage));
        }
        return gridDelta;

    }

    setCameraToHOI4(camera?: Camera, gridFocal?: Vector2) {
        print(`Grid Min: ${this.battle.gridMin}, Grid Max: ${this.battle.gridMax}`);
        const center = gridFocal ?
            new Vector2(gridXYToWorldXY(gridFocal, this.battle.grid).X, gridXYToWorldXY(gridFocal, this.battle.grid).Z) :
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
    setCameraToLookAtModel(model: Model) {
        this.panService?.Disconnect();
        return this.goToModelCam(model).then(() => {
            this.setUpCharCenterCameraPan(model);
        });
    }
    private setUpCharCenterCameraPan(model: Model) {
        print('Setting up Character Center Camera Pan');
        this.panService?.Disconnect();

        const camOriPart = model.WaitForChild("cam-ori") as BasePart | undefined;
        if (!model.PrimaryPart) {
            warn("Model has no PrimaryPart!");
            return;
        }
        else if (!camOriPart) {
            warn("Model has no cam-ori part!");
            return;
        }

        const camera = this.camera ?? Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }

        const mX = model.PrimaryPart.Position.X;
        const mZ = model.PrimaryPart.Position.Z;
        const cX = camOriPart.Position.X;
        const cZ = camOriPart.Position.Z;
        const xDiff = cX - mX;
        const zDiff = cZ - mZ;
        const initAngle = math.atan2(zDiff, xDiff);
        this.angle = initAngle;
        this.panService = RunService.RenderStepped.Connect((deltaTime) => {
            this.updateCharCenterCameraPosition(model, this.detectEdgeMovement(), deltaTime);
        });
    }
    private updateCharCenterCameraPosition(model: Model, gridDelta: Vector2, deltaTime: number) {
        const camOriPart = model.WaitForChild("cam-ori") as BasePart | undefined;
        if (!model.PrimaryPart) {
            warn("Model has no PrimaryPart!");
            return;
        }
        else if (!camOriPart) {
            warn("Model has no cam-ori part!");
            return;
        }

        const mX = model.PrimaryPart.Position.X;
        const mZ = model.PrimaryPart.Position.Z;
        const mY = model.PrimaryPart.Position.Y;
        const cX = camOriPart.Position.X;
        const cZ = camOriPart.Position.Z;
        const cY = camOriPart.Position.Y;

        const xDiff = cX - mX;
        const yDiff = math.abs(mY - cY);
        const zDiff = cZ - mZ;
        const camera = this.camera ?? Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }

        // Calculate the current angle based on time for horizontal rotation
        const radius = math.sqrt((xDiff * xDiff) + (zDiff * zDiff));
        const rotationSpeed = math.rad(60 * math.sign(gridDelta.X) * (gridDelta.X ** 2) * deltaTime); // 30 degrees per second
        this.angle += rotationSpeed;

        // Calculate the new camera position
        const offsetX = math.cos(this.angle) * radius;
        const offsetZ = math.sin(this.angle) * radius;

        const cameraPosition = model.PrimaryPart.Position.add(new Vector3(offsetX, yDiff, offsetZ));

        // Set the camera's CFrame to look at the model
        camera.CFrame = CFrame.lookAt(cameraPosition, model.PrimaryPart.Position)
    }
    private updateHOI4CameraPosition(gridDelta: Vector2) {
        // WARNING: grid x = camera z, grid y = camera x
        const camera = this.camera ?? Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }

        const cameraCFrame = camera.CFrame;
        const cameraPosition = cameraCFrame.Position.add(new Vector3(gridDelta.Y * this.HOI4PanSpeed, 0, gridDelta.X * this.HOI4PanSpeed));

        // Ensure the camera stays within the grid bounds
        const clampedX = math.clamp(cameraPosition.X, this.battle.gridMin.Y, this.battle.gridMax.Y);
        const clampedZ = math.clamp(cameraPosition.Z, this.battle.gridMin.X, this.battle.gridMax.X);

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
                const mX = model.PrimaryPart!.CFrame.X;
                const mZ = model.PrimaryPart!.CFrame.Z;
                const mY = model.PrimaryPart!.CFrame.Y;
                const cX = this.camera.CFrame.X;
                const cZ = this.camera.CFrame.Z;
                const cY = this.camera.CFrame.Y;

                const xDiff = mX - cX;
                const zDiff = mZ - cZ;

                const radius = math.sqrt(xDiff ^ 2 + zDiff ^ 2); // Distance from the model's position
                print(`Distance between: ${radius}`);
                resolve(void 0)
            });
        });
    }
    //#endregion

}