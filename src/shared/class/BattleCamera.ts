import { ReplicatedStorage, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { gridXYToWorldXY } from "shared/utils";
import Battle from "./Battle";

export default class BattleCamera {
    battle: Battle;

    // Camera-Related Information
    static HOI4_PAN_SPEED = 0.6;
    static CHAR_ANGLE = 0;

    worldCenter: Vector2;
    size: number;
    camera: Camera;
    mode: "HOI4" | "CHAR_CENTER" | "ANIMATION" = "HOI4";
    panningEnabled: boolean = true;
    panService: RBXScriptConnection | undefined;

    camAnimFolder: Folder;

    constructor(camera: Camera, worldCenter: Vector2, battle: Battle) {
        this.worldCenter = worldCenter;
        this.size = battle.grid.size;
        this.camera = camera;
        this.battle = battle;
        this.setupRenderStepped();

        this.camAnimFolder = ReplicatedStorage.WaitForChild("CamAnim") as Folder;
    }

    static readonly EDGE_BUFFER = 0.15;

    private setupRenderStepped() {
        // Manage a single RenderStepped connection for all camera panning
        this.panService = RunService.RenderStepped.Connect((deltaTime) => {
            if (this.panningEnabled) {
                const gridDelta = this.detectEdgeMovement();
                this.updateCameraPosition(gridDelta, deltaTime);
            }
        });
    }

    detectEdgeMovement(): Vector2 {
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

    resetAngle(primPart: BasePart, camOriPart: BasePart) {
        const mX = primPart.Position.X;
        const mZ = primPart.Position.Z;
        const cX = camOriPart.Position.X;
        const cZ = camOriPart.Position.Z;
        const xDiff = cX - mX;
        const zDiff = cZ - mZ;
        const initAngle = math.atan2(zDiff, xDiff);
        BattleCamera.CHAR_ANGLE = initAngle;
    }

    async enterHOI4Mode(gridFocal?: Vector2) {
        print('Setting up HOI4 Camera Pan');
        this.panningEnabled = false;
        const focalWorld = gridFocal ?
            gridXYToWorldXY(gridFocal, this.battle.grid) :
            gridXYToWorldXY(this.worldCenter, this.battle.grid);
        print(focalWorld)
        const center = new Vector2(focalWorld.X, focalWorld.Z);


        const x1 = new Vector3(center.X, this.size * 5, center.Y);
        const x2 = new Vector3(center.X, 0, center.Y);
        const lookAtCframe = new CFrame(x1, x2);
        return this.setCameraCFrame(lookAtCframe).then(() => {
            this.mode = "HOI4";
            this.panningEnabled = true
        });
    }

    async enterCharacterCenterMode() {
        print('Setting up Character Center Camera Pan');
        this.panningEnabled = false;
        const model = this.battle.getCurrentRoundEntity()?.model;
        const primPart = model?.PrimaryPart;
        const camOriPart = model?.FindFirstChild("cam-ori") as BasePart;
        if (!primPart || !camOriPart) {
            warn("Primary Part or Camera Orientation Part not found!", this.battle.getCurrentRoundEntity(), model, primPart, camOriPart);
            return;
        }

        this.resetAngle(primPart, camOriPart);
        return model ?
            this.goToModelCam(model).then(() => {
                this.mode = "CHAR_CENTER";
                this.panningEnabled = true;
            }) :
            Promise.resolve();
    }

    private updateCameraPosition(gridDelta: Vector2, deltaTime: number) {
        // Determine which camera mode is active and update accordingly
        switch (this.mode) {
            case "HOI4":
                this.updateHOI4CameraPosition(gridDelta);
                break;
            case "CHAR_CENTER":
                this.updateCharCenterCameraPosition(gridDelta, deltaTime);
                break;
        }
    }

    private updateHOI4CameraPosition(gridDelta: Vector2) {
        const camera = this.camera ?? Workspace.CurrentCamera;
        if (!camera) {
            warn("Camera not found!");
            return;
        }

        const cameraCFrame = camera.CFrame;
        const cameraPosition = cameraCFrame.Position.add(new Vector3(gridDelta.Y * BattleCamera.HOI4_PAN_SPEED, 0, gridDelta.X * BattleCamera.HOI4_PAN_SPEED));

        // Ensure the camera stays within the grid bounds
        const clampedX = math.clamp(cameraPosition.X, this.battle.gridMin.Y, this.battle.gridMax.Y);
        const clampedZ = math.clamp(cameraPosition.Z, this.battle.gridMin.X, this.battle.gridMax.X);

        camera.CFrame = new CFrame(
            new Vector3(clampedX, cameraPosition.Y, clampedZ),
            cameraCFrame.LookVector.add(new Vector3(clampedX, 0, clampedZ))
        );
    }

    private updateCharCenterCameraPosition(gridDelta: Vector2, deltaTime: number) {
        // Assume model is available and valid (add proper checks in production code)
        const model = this.battle.getCurrentRoundEntity()?.model;
        if (model?.PrimaryPart === undefined) {
            warn("Model not found!");
            return;
        }

        const camOriPart = model.WaitForChild("cam-ori") as BasePart;
        const primaryPart = model.PrimaryPart;

        const mX = primaryPart.Position.X;
        const mZ = primaryPart.Position.Z;
        const mY = primaryPart.Position.Y;
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

        const radius = math.sqrt((xDiff * xDiff) + (zDiff * zDiff));
        const rotationSpeed = math.rad(60 * math.sign(gridDelta.X) * (gridDelta.X ** 2) * deltaTime); // 30 degrees per second
        BattleCamera.CHAR_ANGLE += rotationSpeed;

        const offsetX = math.cos(BattleCamera.CHAR_ANGLE) * radius;
        const offsetZ = math.sin(BattleCamera.CHAR_ANGLE) * radius;

        const cameraPosition = model.PrimaryPart.Position.add(new Vector3(offsetX, yDiff, offsetZ));

        camera.CFrame = CFrame.lookAt(cameraPosition, model.PrimaryPart.Position);
    }

    private setCameraCFrame(cFrame: CFrame, tweenInfo?: TweenInfo) {
        const cam = this.camera;
        cam.CameraType = Enum.CameraType.Scriptable;
        const tween = TweenService.Create(
            cam,
            tweenInfo ?? new TweenInfo(0.3, Enum.EasingStyle.Quart, Enum.EasingDirection.InOut),
            { CFrame: cFrame }
        )
        return new Promise<void>((resolve) => {
            tween.Play();
            tween.Completed.Wait();
            resolve();
        });
    }

    private goToModelCam(model: Model) {
        const cam_ori = model.WaitForChild("cam-ori") as BasePart;
        return this.setCameraCFrame(cam_ori.CFrame);
    }

    async playAnimation({ animation, center, }: { animation: string; center?: CFrame }) {
        const a = this.camAnimFolder.FindFirstChild(animation) as Animation;
        const framesFolder = a?.FindFirstChild("Frames") as Folder;
        if (!a) {
            warn("Animation not found!");
            return;
        }
        if (!framesFolder) {
            warn("Frames folder not found!");
            return;
        }

        const oldCameraMode = this.mode;
        const oldCameraType = this.camera.CameraType;
        const oldCameraCFrame = this.camera.CFrame;
        let frameTime = 0;
        this.camera.CameraType = Enum.CameraType.Scriptable;
        this.mode = "ANIMATION";

        // tween to first frame
        const firstFrame = framesFolder.FindFirstChild("0") as CFrameValue;
        if (!firstFrame) {
            warn("First frame not found!");
            return
        }
        const tween = TweenService.Create(
            this.camera,
            new TweenInfo(0.1, Enum.EasingStyle.Quart, Enum.EasingDirection.InOut),
            { CFrame: center ? center.mul(firstFrame.Value) : firstFrame.Value }
        )
        tween.Play();
        tween.Completed.Wait();

        const playPromise = new Promise(resolve => {
            const con = RunService.RenderStepped.Connect((deltaTime) => {
                frameTime += deltaTime * 60;
                const frame = framesFolder.FindFirstChild(tostring(math.ceil(frameTime))) as CFrameValue;
                if (frame) {
                    this.camera.CFrame = center ?
                        center.mul(frame.Value) :
                        frame.Value;
                } else {
                    wait(0.5);
                    con.Disconnect();
                    resolve(void 0);
                }
            });
        })


        return {
            playPromise,
            doneCallback: () => {
                this.camera.CameraType = oldCameraType;
                this.camera.CFrame = oldCameraCFrame;
                this.mode = oldCameraMode;
            }
        };
    }
}
