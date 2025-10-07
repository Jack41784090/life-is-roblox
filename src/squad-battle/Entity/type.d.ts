import { Atom } from "@rbxts/charm";
import { ArmourConfig } from "shared/class/battle/Systems/CombatSystem/Armour/types";
import { iArmour } from "squad-battle/Armour/type";
import { iWeapon } from "squad-battle/Weapon/type";
import { Reality } from "../../shared/class/battle/Systems/CombatSystem/types";
import { EntityBaseStats, EntityChange, EntityChangeable, EntityChangeableStats, EntityUpdate, SquadEntityInSquadLocation, WeaponConfig } from "../type";
import { iLogic, LogicType } from "./Logic/type.d";

export type SquadMetadata = Partial<Record<SquadEntityInSquadLocation, iSquadEntity[]>>;

export type EntityConfig = {
    playerID: number;
    stats: EntityBaseStats;
    name?: string;
    team: string;
    weapon?: WeaponConfig;
    armour?: ArmourConfig;
    startingLocation?: SquadEntityInSquadLocation;
    logicType: LogicType;
};

export interface iSquadEntity {
    attacked(by: iSquadEntity, chosenWeapon?: iWeapon): EntityUpdate[]

    get_armour(): iArmour;
    readonly playerID: number;
    name: string;
    readonly stats: EntityBaseStats;
    readonly changeableStats: EntityChangeableStats;
    team: string;
    weapon: iWeapon;
    armour: iArmour;

    setLogic(logic: iLogic): void;
    newRoundReset(): void;
    isDead(): boolean;

    getCeiling_changeableStat(property: EntityChangeable): number;
    getFloor_changeableStat(property: EntityChangeable): number;

    mod_changeableStat(property: EntityChangeable, by: number): EntityChange;
    set_changeableStat(property: EntityChangeable, to: number): EntityChange;
    get_changeableStat_num(property: EntityChangeable): number;
    get_changeableStat_atm(property: EntityChangeable): Atom<number>;

    heal(num: number): EntityChange | undefined;
    boost(num: number): EntityChange | undefined;
    recover(): EntityChange[];
    damage(num: number, source: number): EntityUpdate[];

    calculateRealityValue(reality: Reality): number;

    action(ourSquad: SquadMetadata, enemySquad: SquadMetadata): EntityUpdate[];
    reaction(our_squad: SquadMetadata, enemy_squad: SquadMetadata): EntityUpdate[];
}