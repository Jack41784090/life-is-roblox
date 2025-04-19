import { CConfig } from "shared/class/explorer/C/types";



export enum CutsceneAction {
    idle,
    action1,
    action2,
    Move,
}


export type Prop = {
    location: Vector3,
    modelID: string,
}


export type ActorConfig = CConfig;
