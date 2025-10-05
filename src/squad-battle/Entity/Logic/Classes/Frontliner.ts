import { uniformRandom } from "shared/utils";
import { SquadEntityInSquadLocation } from "../../../type";
import { iSquadEntity } from "../../type.d";
import { Logic } from "../index";
import { LogicContext, SquadEntityAction } from "../type.d";

export default class Frontline extends Logic {

    constructor(context: LogicContext) {
        super(context);
    }

    private forwardIfBrave(): SquadEntityAction | undefined {
        if (this.entity.get_changeableStat_num('ORG') / this.entity.getCeiling_changeableStat('ORG') > 0.5) {
            return 'forward' as SquadEntityAction;
        }
        return undefined;
    }

    public override choose_action() {
        const { myLocation } = this.situation.unwrap();
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_action();
        }
    }

    public override choose_reaction() {
        const { myLocation } = this.situation.unwrap();
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                this.logger.debug("At frontline, will attack")
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_reaction();
        }
    }

    public override choose_target() {
        // Thinking process:
        const { myLocation, frontline_enemy, frontline_enemyCount, midline_enemy, midline_enemyCount, backline_enemy, backline_enemyCount } = this.situation.unwrap();

        let myTarget: iSquadEntity | undefined;
        switch (myLocation) {
            // I am at the frontlines, so my priority should be those in front of me
            case SquadEntityInSquadLocation.front:
                myTarget = (frontline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, frontline_enemyCount - 1, true)] ||
                    (midline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (midline_enemyCount || 1) - 1, true)] ||
                    (backline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (backline_enemyCount || 1) - 1, true)];
                break;
            case SquadEntityInSquadLocation.middle:
                myTarget = (midline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, midline_enemyCount - 1, true)] ||
                    (frontline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (frontline_enemyCount || 1) - 1, true)] ||
                    (backline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (backline_enemyCount || 1) - 1, true)];
                break;
            case SquadEntityInSquadLocation.back:
                myTarget = (backline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, backline_enemyCount - 1, true)] ||
                    (midline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (midline_enemyCount || 1) - 1, true)] ||
                    (frontline_enemy as unknown as iSquadEntity[])?.[uniformRandom(0, (frontline_enemyCount || 1) - 1, true)];
                break;
        }
        return myTarget;
    }
}