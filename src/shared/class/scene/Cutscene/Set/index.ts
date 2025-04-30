import { Workspace } from "@rbxts/services";
import C from "shared/class/explorer/C";
import Logger from "shared/utils/Logger";
import { ActorConfig } from "../types";
import { SetConfig } from "./types";

export class CutsceneActor extends C {
    constructor(actorConfig: ActorConfig) {
        super(actorConfig);
        this.logger.recontext("Actor");
        this.logger.info("Actor created", actorConfig);
    }
}

export class CutsceneSet {
    private actorShells: ActorConfig[];
    public actors: CutsceneActor[] = [];
    private logger = Logger.createContextLogger("CutsceneSet");
    private showing = false;
    private cutsceneModel: Model;
    private setModel: Model;
    private scriptModel: Model;
    private centreOfScene: Vector3;

    constructor(
        public setting: SetConfig,
    ) {
        this.cutsceneModel = setting.cutsceneModel;
        this.setModel = setting.cutsceneModel.WaitForChild("Set") as Model;
        this.scriptModel = setting.cutsceneModel.WaitForChild("Script") as Model;
        this.centreOfScene = setting.centreOfScene;
        this.actorShells = setting.actors;
        this.logger.info("Cutscene set created", setting);
    }

    private showSetModels() {
        const setModel = this.setModel;
        this.cutsceneModel.Parent = game.Workspace;
        this.cutsceneModel.PivotTo(new CFrame(this.centreOfScene));
        setModel.Parent = game.Workspace;
        const setModelDescendants = setModel.GetDescendants();
        for (const descendant of setModelDescendants) {
            if (descendant.IsA("BasePart")) {
                descendant.CanCollide = true;
                descendant.Anchored = true;
                descendant.Transparency = 0;
            }
        }
    }

    private hideScriptVisualAid() {
        const scriptModel = this.scriptModel;
        const scriptModelDescendants = scriptModel.GetDescendants();
        for (const descendant of scriptModelDescendants) {
            if (descendant.IsA("BasePart")) {
                descendant.CanCollide = false;
                descendant.Anchored = true;
                descendant.Transparency = 1;
            }
        }
    }

    private initializeActors() {
        this.actors = this.actorShells.map(actorConfig => {
            const actor = new CutsceneActor(actorConfig);
            actor.getModel().Parent = this.cutsceneModel;
            return actor;
        });
    }

    public show() {
        if (this.showing) {
            this.logger.warn("Cutscene set is already showing");
            return;
        }
        this.showing = true;
        this.showSetModels()
        this.hideScriptVisualAid();
        this.initializeActors();
    }

    public getModel() {
        return this.cutsceneModel;
    }

    public getAny(model: string) {
        return model === "camera" ?
            this.getCamera() :
            this.getActor(model);
    }

    public getActor(targetedModel: string) {
        return this.actors.find(a => a.getModelID() === targetedModel);
    }

    public getCamera() {
        const camera = this.cutsceneModel.FindFirstChild("Camera") ?? Workspace.CurrentCamera;
        if (camera && camera.IsA("Camera")) {
            return camera;
        } else {
            this.logger.error("No camera found in cutscene model");
            return undefined;
        }
    }
}