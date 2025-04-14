import C from "shared/class/explorer/C";
import Place from "shared/class/explorer/Place";
import Logger from "shared/utils/Logger";
import { ActorConfig, Prop } from "../types";
import { SetConfig } from "./types";


export class Set extends Place {
    constructor(config: SetConfig) {
        super(config);
    }
}

class Actor extends C {
    constructor(actorConfig: ActorConfig) {
        super(actorConfig, actorConfig.set);
    }
}

export class CutsceneSet {
    private logger = Logger.createContextLogger("CutsceneSet")
    constructor(
        public setting: Prop,
        public actors: Actor[],
        public props: Prop[],
    ) {

    }

    public getActor(targetedModel: string) {
        return this.actors.find(a => a.getModelID() === targetedModel);
    }
}