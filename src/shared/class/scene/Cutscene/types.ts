import { CConfig } from "shared/class/explorer/C/types";
import { Set } from "./Set";



export enum CutsceneAction {
    idle,
    action1,
    action2,
}


export type Prop = {
    location: Vector3,
    modelID: string,
}


export type ActorConfig = CConfig & Prop & {
    set: Set;
};

