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
        const { myLocation } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_action();
        }
    }

    public override choose_reaction() {
        const { myLocation } = this.situation;
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
        const { myLocation, frontLineEnemies, frontlineNumbers, midlineEnemies, midlineNumbers, backlineEnemies, backlineNumbers } = this.situation;

        let myTarget: iSquadEntity | undefined;
        switch (myLocation) {
            // I am at the frontlines, so my priority should be those in front of me
            case SquadEntityInSquadLocation.front:
                myTarget = frontLineEnemies?.[uniformRandom(0, frontlineNumbers - 1, true)] ||
                    midlineEnemies?.[uniformRandom(0, (midlineNumbers || 1) - 1, true)] ||
                    backlineEnemies?.[uniformRandom(0, (backlineNumbers || 1) - 1, true)];
                break;

            // i should be at the frontline!
            default:
                break;
        }

        // this.logger.debug(`chosetarget: ${myTarget?.name || "cannot"}`);
        return myTarget;
    }
}