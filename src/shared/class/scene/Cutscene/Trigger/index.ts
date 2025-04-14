import { CutsceneAction } from "../types";


export class Trigger {
    constructor(
        public modelID: string,
        public cutsceneAction: CutsceneAction,
        public activated: boolean,
        public finished: boolean,
    ) {

    }
}
