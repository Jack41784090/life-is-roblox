import { iSquadEntity } from "../Entity/type.d";
import { iSquad } from "../Squad/type.d";
import { EntityUpdate } from "../type";

export interface iSquadBattle {
    teamsAndSquads: Record<string, iSquad[]>;
    roundCount: number;

    getEntityByID(affected: number): iSquadEntity;
    removeCapitulatedEntities(capitulatedEntities: Set<iSquadEntity>): void;
    checkTeamStrength(teamName: string): number;
    checkVictory(): boolean;
    squadRecoveries(): void;
    squadActions(): EntityUpdate[];
    removeDeadEntities(): void;
}