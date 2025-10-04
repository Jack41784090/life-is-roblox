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

        this.situation = {
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
            backlineNumbers,
            [SquadEntityInSquadLocation.front]: {
                allies: frontlineAllies,
                alliesNumbers: frontlineAlliesNumbers,
                enemies: frontLineEnemies,
                enemiesNumbers: frontlineNumbers,
            },
            [SquadEntityInSquadLocation.middle]: {
                allies: midlineAllies,
                alliesNumbers: midlineAlliesNumbers,
                enemies: midlineEnemies,
                enemiesNumbers: midlineNumbers,
            },
            [SquadEntityInSquadLocation.back]: {
                allies: backlineAllies,
                alliesNumbers: backlineAlliesNumbers,
                enemies: backlineEnemies,
                enemiesNumbers: backlineNumbers,
            },
        };
        // this.logger.debug(
        //     `Situation:\n`
        // );
        // print(this.situation);
        return this.situation;
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

    protected readjustWeapon() {
        const { myLocation } = this.situation;
        const weapon = this.choose_weapon();
        const frontOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.front);
        const midOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.middle);
        const backOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.back);
        const frontOptionsTotalCount = frontOptions.reduce((a, b) => a + (this.situation[SquadEntityInSquadLocation.front]?.enemiesNumbers ?? 0), 0);
        const midOptionsTotalCount = midOptions.reduce((a, b) => a + (this.situation[SquadEntityInSquadLocation.middle]?.enemiesNumbers ?? 0), 0);
        const backOptionsTotalCount = backOptions.reduce((a, b) => a + (this.situation[SquadEntityInSquadLocation.back]?.enemiesNumbers ?? 0), 0);
        this.logger.debug(
            `My location: ${myLocation}\n` +
            `Weapon options total count: front ${frontOptionsTotalCount}, mid ${midOptionsTotalCount}, back ${backOptionsTotalCount}`
        )

        if (math.max(frontOptionsTotalCount, midOptionsTotalCount, backOptionsTotalCount) === weapon.getRangeAtLocation(myLocation).size()) {
            this.logger.debug("No need to change weapon range");
            return;
        }

        switch (myLocation) {
            case SquadEntityInSquadLocation.front:
                if (midOptionsTotalCount > frontOptionsTotalCount) {
                    return 'retreat' as SquadEntityAction;
                }
                break;

            case SquadEntityInSquadLocation.middle:
                const max = math.max(frontOptionsTotalCount, backOptionsTotalCount)
                if (max === frontOptionsTotalCount) {
                    return 'forward' as SquadEntityAction;
                }
                if (max === backOptionsTotalCount) {
                    return 'retreat' as SquadEntityAction;
                }
                break;

            case SquadEntityInSquadLocation.back:
                if (midOptionsTotalCount > backOptionsTotalCount) {
                    return 'forward' as SquadEntityAction;
                }
                break;
        }

        return undefined
    }

    public choose_weapon(): iWeapon {
        return this.entity.weapon;
    }

    public choose_reaction(): SquadEntityAction {
        const { myLocation, backlineAllies, backlineAlliesNumbers } = this.situation;
        switch (myLocation) {
            case SquadEntityInSquadLocation.back:
                if (this.entity.get_changeableStat_num('ORG') === 0) {
                    return 'capitulate'
                }
            default:
                return this.retreatIfOutnumbered() || this.readjustWeapon() || this.healOthersIfAround() || 'idle'
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
                return this.healOthersIfAround() || this.readjustWeapon() || 'idle'
        }
    }

    public choose_target(): iSquadEntity | undefined {
        // return this.context.enemy_squad[uniformRandom(0, 2, true) as SquadEntityInSquadLocation].;
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

export class AdjustWeaponTest extends Logic {
    constructor(context: LogicContext) {
        super(context);
    }

    public override choose_action() {
        return (this.readjustWeapon() || 'idle') as SquadEntityAction;
    }
    public override choose_reaction() {
        return (this.readjustWeapon() || 'idle') as SquadEntityAction;
    }
}
