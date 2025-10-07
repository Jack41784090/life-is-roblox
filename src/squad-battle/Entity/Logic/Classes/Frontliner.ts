import { uniformRandom } from "shared/utils";
import { SquadEntityInSquadLocation } from "../../../type";
import { iSquadEntity } from "../../type.d";
import { Logic } from "../index";
import { LogicContext, SquadEntityAction } from "../type.d";

export default class Frontline extends Logic {
    constructor(context: LogicContext) {
        super(context);
        this.logger.recontext('frontline-logic')
    }

    private forwardIfBrave(): SquadEntityAction | undefined {
        if (this.entity.get_changeableStat_num('LOC') === SquadEntityInSquadLocation.front) return undefined;
        if (this.entity.get_changeableStat_num('ORG') / this.entity.getCeiling_changeableStat('ORG') > 0.5) {
            return 'forward' as SquadEntityAction;
        }
        return undefined;
    }

    public override choose_action() {
        const myLocation = this.situation.myLocation();
        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                return 'attack' as SquadEntityAction;
            default:
                return this.forwardIfBrave() || super.choose_action();
        }
    }

    public override choose_reaction() {
        return this.choose_action();
    }

    public override choose_target() {
        const { myLocation, frontline_enemy, midline_enemy, backline_enemy } = this.situation.unwrap();
        const weapon = this.choose_weapon();
        const availableLocs = weapon.getRangeAtLocation(myLocation);
        const targets = availableLocs.reduce((acc, loc) => {
            switch (loc) {
                case SquadEntityInSquadLocation.front:
                    frontline_enemy?.forEach(e => acc.push(e));
                    break;
                case SquadEntityInSquadLocation.middle:
                    midline_enemy?.forEach(e => acc.push(e));
                    break;
                case SquadEntityInSquadLocation.back:
                    backline_enemy?.forEach(e => acc.push(e));
                    break;
            }
            return acc;
        }, [] as iSquadEntity[]);
        this.logger.debug("targets:", targets)
        return targets.size() > 0 ? targets[uniformRandom(0, targets.size() - 1)] : undefined;
    }
}