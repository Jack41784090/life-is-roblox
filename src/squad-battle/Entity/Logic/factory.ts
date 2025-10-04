import { iSquadEntity } from "../type.d";
import Frontline from "./Classes/Frontliner";
import { Absurd, AdjustWeaponTest, Logic } from "./index";
import { iLogic, LogicContext, LogicType } from "./type.d";

export function createLogic(entity: iSquadEntity, logicType: LogicType = 'Default'): iLogic {
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
        case 'Adjust_Weapon_Test':
            return new AdjustWeaponTest(context);
        // return new Logic(context);
        default:
            return new Logic(context);
    }
}