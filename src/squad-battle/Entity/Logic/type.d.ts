import { iOneClash } from "squad-battle/Battle/System/type";
import { iWeapon } from "squad-battle/Weapon/type";
import { SquadEntityInSquadLocation } from "../../type";
import { iSquadEntity } from "../type.d";

export type SquadEntityAction = |
    'idle' |
    'forward' |
    'retreat' |
    'attack' |
    'heal' |
    'capitulate'

export type SquadBattleSituation = {
    myLocation: SquadEntityInSquadLocation;
    [location: number]: {
        allies: iSquadEntity[] | undefined;
        alliesNumbers: number | undefined;
        enemies: iSquadEntity[] | undefined;
        enemiesNumbers: number | undefined;
    }

    frontlineAllies: iSquadEntity[] | undefined;
    frontlineAlliesNumbers: number | undefined;
    midlineAllies: iSquadEntity[] | undefined;
    midlineAlliesNumbers: number | undefined;
    backlineAllies: iSquadEntity[] | undefined;
    backlineAlliesNumbers: number | undefined;

    frontLineEnemies: iSquadEntity[] | undefined;
    frontlineNumbers: number;
    midlineEnemies: iSquadEntity[] | undefined;
    midlineNumbers: number | undefined;
    backlineEnemies: iSquadEntity[] | undefined;
    backlineNumbers: number | undefined;
}

export type LogicContext = {
    entity: iSquadEntity;
    enemy_squad: Partial<Record<SquadEntityInSquadLocation, iSquadEntity[]>>;
    our_squad: Partial<Record<SquadEntityInSquadLocation, iSquadEntity[]>>;
}

export type LogicType = |
    'Frontline' |
    'Backline' |
    'Absurd' |
    'Adjust_Weapon_Test' |
    'Default'

export interface iLogic {
    updateSituation(context: LogicContext): iLogic;
    get_sameLineAllies(): iSquadEntity[] | undefined;
    choose_weapon(): iWeapon;
    choose_reaction(): SquadEntityAction;
    choose_action(): SquadEntityAction;
    choose_clash(): iOneClash | undefined;
}