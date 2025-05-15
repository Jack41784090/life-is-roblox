import { RunService, UserInputService } from "@rbxts/services";
import Logger from "shared/utils/Logger";
import { Cutscene } from ".";
import { CutsceneActor } from "./Set";
import { LookAtTrigger } from "./Trigger";

export class CameraManager {
    private logger = Logger.createContextLogger("CameraManager");
    private cutscene: Cutscene;
    private originalCameraType: Enum.CameraType = Enum.CameraType.Scriptable;
    private cameraAngle: number = 0;
    private cameraEnabled: boolean = true;
    private cameraMode: "FREE" | "LOCKED" | "FOLLOWING" = "FREE";
    private cameraControl?: RBXScriptConnection;

    constructor(cutscene: Cutscene) {
        this.cutscene = cutscene;
        const camera = this.cutscene.getCamera();
        if (camera) {
            this.originalCameraType = camera.CameraType;
        }
    }

    public initialize(): void {
        const camera = this.cutscene.getCamera();
        if (!camera) return;

        // Clean up any existing camera control connection
        this.cameraControl?.Disconnect();

        // Setup edge-based camera rotation for character-centered view
        this.cameraControl = RunService.RenderStepped.Connect((deltaTime) => {
            if (!this.cameraEnabled || this.cameraMode !== "FREE") {
                this.logger.debug("Camera control is disabled or not in FREE mode");
                return;
            }
            this.logger.debug("Camera control is enabled");
            // Get mouse position for edge detection
            const mousePosition = UserInputService.GetMouseLocation();
            const screenSize = camera.ViewportSize;

            // Calculate edge detection (similar to BattleCamera's detectEdgeMovement)
            const edgeBuffer = 0.15; // Edge buffer percentage
            const edgeBuffer_x = screenSize.X * edgeBuffer;

            // Handle horizontal edge rotation
            if (mousePosition.X < edgeBuffer_x) {
                // Rotate left when mouse is at left edge
                const percentage = 1 - math.clamp(mousePosition.X / edgeBuffer_x, 0, 1);
                this.rotateCamera(percentage * 60 * deltaTime, camera);
            } else if (mousePosition.X > screenSize.X - edgeBuffer_x) {
                // Rotate right when mouse is at right edge
                const percentage = 1 - math.clamp((screenSize.X - mousePosition.X) / edgeBuffer_x, 0, 1);
                this.rotateCamera(-percentage * 60 * deltaTime, camera);
            }
        });
    }

    private rotateCamera(angleChange: number, camera: Camera): void {
        this.logger.debug(`Rotating camera by ${angleChange} degrees`);
        const currentCFrame = camera.CFrame;
        const rotation = CFrame.Angles(0, math.rad(angleChange), 0);
        camera.CFrame = currentCFrame.mul(rotation);
    }

    public handleLookAt(lookAtTrigger: LookAtTrigger): Promise<void> {
        this.logger.debug(`Handling LookAt trigger: ${lookAtTrigger.name}`);
        this.cameraEnabled = false;
        this.cameraMode = "LOCKED";

        const camera = this.cutscene.getCamera();
        if (!camera) {
            return Promise.resolve();
        }

        const lookAt = this.cutscene.getAny(lookAtTrigger.lookAtActor);
        if (!lookAt) {
            return Promise.resolve();
        }

        assert(lookAt instanceof CutsceneActor, "LookAt target must be a CutsceneActor");
        const lookAtPosition = lookAt.getModel().GetPivot().Position;

        // Create the animation
        const startCFrame = camera.CFrame;
        const endCFrame = CFrame.lookAt(startCFrame.Position, lookAtPosition);

        return new Promise<void>((resolve) => {
            let elapsed = 0;
            const duration = 1;
            const connection = RunService.RenderStepped.Connect((dt) => {
                elapsed += dt;
                const alpha = math.clamp(elapsed / duration, 0, 1);

                camera.CFrame = startCFrame.Lerp(endCFrame, alpha);

                if (alpha >= 1) {
                    connection.Disconnect();
                    resolve();
                }
            });
        });
    }

    public releaseCameraControl(): void {
        this.cameraEnabled = true;
        this.cameraMode = "FREE";
    }

    public cleanup(): void {
        this.cameraControl?.Disconnect();
        const camera = this.cutscene.getCamera();
        if (camera) {
            camera.CameraType = this.originalCameraType;
        }
    }
}
