import { atom, Atom } from "@rbxts/charm";
import { RunService } from "@rbxts/services";
import { Config, DEFAULT_HEIGHT, DEFAULT_WIDTH } from "shared/types/battle-types";
import Entity from "./Entity";
import State from "./State";

type EntityMap = Map<string, Entity>;

class Battle extends State {
    entities: Atom<EntityMap>;

    static Create(config: Partial<Config>) {
        if (RunService.IsServer()) {

        }
        else {
            warn("Cannot create Battle instance on client.");
            return undefined;
        }
    }

    private constructor(config: Partial<Config>) {
        super(config.width ?? DEFAULT_WIDTH, config.height ?? DEFAULT_HEIGHT, config.worldCenter ?? , config.teamMap);
        this.entities = atom(new Map<string, Entity>());
    }
}



export default Battle