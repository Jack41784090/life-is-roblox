import { TeamState } from "shared/types/battle-types";
import Entity from "../Entity";
import Team from "../Team";

export class TeamManager {
    private teams: Team[] = [];

    constructor(teamMap: Map<string, Entity[]>) {
        for (const [teamName, entityList] of pairs(teamMap)) {
            for (const e of entityList) {
                this.addEntityToTeam(teamName, e);
            }
        }
    }

    public createTeam(name: string): Team {
        const team = new Team(name, []);
        this.teams.push(team);
        return team;
    }

    public getTeam(name: string): Team | undefined {
        return this.teams.find(team => team.name === name);
    }

    public addEntityToTeam(teamName: string, entity: Entity, createNew = true): boolean {
        const team = this.getTeam(teamName);
        if (team) {
            team.addMembers(entity);
            return true;
        }
        else if (createNew) {
            const newTeam = this.createTeam(teamName);
            newTeam.addMembers(entity);
            return true;
        }
        return false;
    }

    public getTeamState(): TeamState[] {
        warn("getTeamState is deprecated, use getTeamStates instead", this.teams);
        return this.teams.map(team => ({
            name: team.name,
            members: team.members.map(entity => entity.state()),
        }));
    }

    public updateTeams(teamStates: TeamState[]): void {
        for (const teamState of teamStates) {
            const existingTeam = this.getTeam(teamState.name);
            if (existingTeam) {
                // Update existing team members
                // Implementation depends on how you want to handle updates
            } else {
                // Create new team
                const newTeam = new Team(teamState.name, []);
                this.teams.push(newTeam);
            }
        }
    }

    public getAllTeams(): Team[] {
        return this.teams;
    }
}