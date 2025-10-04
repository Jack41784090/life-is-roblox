import Logger, { ContextLogger } from "shared/utils/Logger";
import { iWeapon } from "squad-battle/Weapon/type";
import { SquadEntityInSquadLocation } from "../../type";
import { iSquadEntity } from "../type.d";
import { iLogic, LogicContext, SquadBattleSituation, SquadEntityAction } from "./type.d";

export class Logic implements iLogic {
    protected logger: ContextLogger;
    protected entity: iSquadEntity;
    protected situation: SquadBattleSituation;
    protected context: LogicContext;

    public constructor(context: LogicContext) {
        this.context = context;
        this.entity = context.entity;
        this.logger = Logger.createContextLogger(this.entity.name + "--logic")
        this.situation = this.accessSituation(context);
    }

    public updateSituation(context: LogicContext) {
        this.context = context;
        this.situation = this.accessSituation(context);
        return this as iLogic;
    }

    public choose_weapon(): iWeapon {
        return this.entity.weapon;
    }

    public get_sameLineAllies() {
        const myLocation = this.entity.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        return this.context.our_squad[myLocation];
    }

    protected accessSituation(context: LogicContext): SquadBattleSituation {
        // 1. Where am I right now?
        const myLocation = this.entity.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
        this.logger.debug(`My location: ${myLocation}`);

        // 2. Where are my enemies right now? and how are they doing?
        const frontLineEnemies = context.enemy_squad[SquadEntityInSquadLocation.front]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const frontlineNumbers = frontLineEnemies?.size() || 0;
        const midlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.middle]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const midlineNumbers = midlineEnemies?.size();
        const backlineEnemies = context.enemy_squad[SquadEntityInSquadLocation.back]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const backlineNumbers = backlineEnemies?.size();

        // 3. Where are my allies right now? and how are they doing?
        const frontlineAllies = context.our_squad[SquadEntityInSquadLocation.front]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const frontlineAlliesNumbers = frontlineAllies?.size();
        const midlineAllies = context.our_squad[SquadEntityInSquadLocation.middle]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const midlineAlliesNumbers = midlineAllies?.size();
        const backlineAllies = context.our_squad[SquadEntityInSquadLocation.back]?.filter(e => e.get_changeableStat_num('HP') > 0);
        const backlineAlliesNumbers = backlineAllies?.size();

        return this.situation = {
            myLocation,
            frontlineAllies,
            frontlineAlliesNumbers,
            midlineAllies,
            midlineAlliesNumbers,
            backlineAllies,
            backlineAlliesNumbers,
            frontLineEnemies,
            frontlineNumbers,
            midlineEnemies,
            midlineNumbers,
            backlineEnemies,
            backlineNumbers
        }
    }

    protected healOthersIfAround(): SquadEntityAction | undefined {
        const mylocation = this.situation.myLocation;
        let allies: iSquadEntity[] | undefined;
        this.context.our_squad[mylocation] && (allies = this.context.our_squad[mylocation]);
        if (allies?.size()) {
            return 'heal';
        }
        return undefined;
    }

    protected retreatIfOutnumbered(): SquadEntityAction | undefined {
        const { myLocation, frontlineAlliesNumbers, frontlineNumbers, midlineAlliesNumbers, midlineNumbers, backlineAlliesNumbers, backlineNumbers } = this.situation;
        let myAllies = (frontlineAlliesNumbers || 0) + (midlineAlliesNumbers || 0) + (backlineAlliesNumbers || 0);
        let myEnemies = (frontlineNumbers || 0) + (midlineNumbers || 0) + (backlineNumbers || 0);
        if (myEnemies > myAllies * 2) {
            if (myLocation === SquadEntityInSquadLocation.back) {
                return 'capitulate';
            }
            return 'retreat';
        }
        return undefined;
    }

    public choose_reaction(): SquadEntityAction {
        const { myLocation, backlineAllies, backlineAlliesNumbers } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.back:
                if (this.entity.get_changeableStat_num('ORG') === 0) {
                    return 'capitulate'
                }
            default:
                return this.retreatIfOutnumbered() || this.healOthersIfAround() || 'idle'
        }
    }

    public choose_action(): SquadEntityAction {
        const { myLocation, backlineAllies, backlineAlliesNumbers } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.back:
                if (this.entity.get_changeableStat_num('ORG') === 0) {
                    return 'idle'
                }
            default:
                return this.healOthersIfAround() || 'idle'
        }
    }

    public choose_target(): iSquadEntity | undefined {
        return undefined;
    }
}

export class Absurd extends Logic {
    constructor(context: LogicContext) {
        super(context);
    }

    public override choose_action() {
        return 'forward' as SquadEntityAction;
    }

    public override choose_reaction() {
        return 'retreat' as SquadEntityAction;
    }
}
