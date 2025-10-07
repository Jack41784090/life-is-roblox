import Logger, { ContextLogger } from "shared/utils/Logger";
import { iWeapon } from "squad-battle/Weapon/type";
import { SquadEntityInSquadLocation } from "../../type";
import { iSquadEntity } from "../type.d";
import { iLogic, LogicContext, SquadEntityAction } from "./type.d";

export class Logic implements iLogic {
    protected logger: ContextLogger;
    protected entity: iSquadEntity;
    protected situation: Situation;
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

    protected accessSituation(context: LogicContext): Situation {
        this.situation = new Situation(context);
        return this.situation;
    }

    protected healOthersIfAround(): SquadEntityAction | undefined {
        const mylocation = this.situation.myLocation();
        let allies: iSquadEntity[] | undefined;
        this.context.our_squad[mylocation] && (allies = this.context.our_squad[mylocation]);
        if ((allies)?.size()) {
            return 'heal';
        }
        return undefined;
    }

    protected retreatIfOutnumbered(): SquadEntityAction | undefined {
        const { myLocation, frontline_allyCount, frontline_enemyCount, midline_allyCount, midline_enemyCount, backline_allyCount, backline_enemyCount } = this.situation.unwrap();
        let myAllies = (frontline_allyCount || 0) + (midline_allyCount || 0) + (backline_allyCount || 0);
        let myEnemies = (frontline_enemyCount || 0) + (midline_enemyCount || 0) + (backline_enemyCount || 0);
        if (myEnemies > myAllies * 2) {
            if (myLocation === SquadEntityInSquadLocation.back) {
                return 'capitulate';
            }
            return 'retreat';
        }
        return undefined;
    }

    protected readjustWeapon() {
        const { myLocation, frontline_enemyCount, midline_enemyCount, backline_enemyCount } = this.situation.unwrap();
        const weapon = this.choose_weapon();
        const frontOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.front);
        const midOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.middle);
        const backOptions = weapon.getRangeAtLocation(SquadEntityInSquadLocation.back);
        const frontOptionsTotalCount = frontOptions.reduce((a, b) => {
            switch (b) {
                case SquadEntityInSquadLocation.front: return a + (frontline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.middle: return a + (midline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.back: return a + (backline_enemyCount ?? 0);
            }
        }, 0);
        const midOptionsTotalCount = midOptions.reduce((a, b) => {
            switch (b) {
                case SquadEntityInSquadLocation.front: return a + (frontline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.middle: return a + (midline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.back: return a + (backline_enemyCount ?? 0);
            }
        }, 0);
        const backOptionsTotalCount = backOptions.reduce((a, b) => {
            switch (b) {
                case SquadEntityInSquadLocation.front: return a + (frontline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.middle: return a + (midline_enemyCount ?? 0);
                case SquadEntityInSquadLocation.back: return a + (backline_enemyCount ?? 0);
            }
        }, 0);
        this.logger.debug(
            `My location: ${myLocation}\n` +
            `Weapon options total count: front ${frontOptionsTotalCount}, mid ${midOptionsTotalCount}, back ${backOptionsTotalCount}`
        );

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
        const { myLocation, backline_ally, backline_allyCount } = this.situation.unwrap();
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
        const { myLocation, backline_ally, backline_allyCount } = this.situation.unwrap();
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
        this.logger.debug("default choose target called")
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

// ====================================

class Situation {
    private context: LogicContext;

    constructor(context: LogicContext) {
        this.context = context;
    }

    public myLocation() {
        return this.context.entity.get_changeableStat_num('LOC') as SquadEntityInSquadLocation;
    }

    private getEffectiveLines(isAlly: boolean): iSquadEntity[][] {
        const lines = [SquadEntityInSquadLocation.front, SquadEntityInSquadLocation.middle, SquadEntityInSquadLocation.back];
        const result: iSquadEntity[][] = [];
        for (const loc of lines) {
            const entities = isAlly ? this.context.our_squad[loc] : this.context.enemy_squad[loc];
            if (entities && (entities).size() > 0) {
                result.push(entities);
            }
        }
        return result;
    }

    private getEffectiveLine(isAlly: boolean, effectiveIndex: number): iSquadEntity[] | undefined {
        const effective = this.getEffectiveLines(isAlly);
        return effective[effectiveIndex];
    }

    public frontline_ally(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(true, 0);
        const positional = this.context.our_squad[SquadEntityInSquadLocation.front];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }

    public midline_ally(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(true, 1);
        const positional = this.context.our_squad[SquadEntityInSquadLocation.middle];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }

    public backline_ally(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(true, 2);
        const positional = this.context.our_squad[SquadEntityInSquadLocation.back];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }

    public frontline_enemy(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(false, 0);
        const positional = this.context.enemy_squad[SquadEntityInSquadLocation.front];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }

    public midline_enemy(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(false, 1);
        const positional = this.context.enemy_squad[SquadEntityInSquadLocation.middle];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }

    public backline_enemy(): iSquadEntity[] | undefined {
        const dynamic = this.getEffectiveLine(false, 2);
        const positional = this.context.enemy_squad[SquadEntityInSquadLocation.back];
        if (!dynamic && !positional) return undefined;
        if (dynamic === positional) return dynamic;
        return [...(dynamic || []), ...(positional || [])];
    }


    public unwrap() {
        const frontline_ally = this.frontline_ally();
        const midline_ally = this.midline_ally();
        const backline_ally = this.backline_ally();
        const frontline_enemy = this.frontline_enemy();
        const midline_enemy = this.midline_enemy();
        const backline_enemy = this.backline_enemy();
        return {
            // const { myLocation, frontlineAlliesNumbers, frontlineNumbers, midlineAlliesNumbers, midlineNumbers, backlineAlliesNumbers, backlineNumbers } = this.situation;
            myLocation: this.myLocation(),
            frontline_allyCount: frontline_ally?.size() || 0,
            frontline_enemyCount: frontline_enemy?.size() || 0,
            midline_allyCount: midline_ally?.size() || 0,
            midline_enemyCount: midline_enemy?.size() || 0,
            backline_allyCount: backline_ally?.size() || 0,
            backline_enemyCount: backline_enemy?.size() || 0,
            frontline_ally,
            midline_ally,
            backline_ally,
            frontline_enemy,
            midline_enemy,
            backline_enemy,
        }
    }
}
