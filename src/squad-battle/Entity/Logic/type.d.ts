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

export interface iLogic {
    choose_weapon(): iWeapon;
    updateSituation(context: LogicContext): iLogic;
    get_sameLineAllies(): iSquadEntity[] | undefined;
    choose_reaction(): SquadEntityAction;
    choose_action(): SquadEntityAction;
    choose_target(): iSquadEntity | undefined;
}