import { iSquadEntity } from "../type.d";
import Frontline from "./Classes/Frontliner";
import { Absurd, Logic } from "./index";
import { iLogic, LogicContext } from "./type.d";

export function createLogic(entity: iSquadEntity, logicType: 'Frontline' | 'Backline' | 'Absurd' = 'Frontline'): iLogic {
    const context: LogicContext = {
        entity,
        enemy_squad: {},
        our_squad: {}
    };

    switch (logicType) {
        case 'Frontline':
            return new Frontline(context);
        case 'Absurd':
            return new Absurd(context);
        default:
            return new Logic(context);
    }
}