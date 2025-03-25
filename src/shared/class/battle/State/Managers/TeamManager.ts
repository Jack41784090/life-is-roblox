import { TeamState } from "shared/types/battle-types";
import Entity from "../Entity";
import Team from "../Team";

export class TeamManager {
    private teams: Team[] = [];

    public createTeam(name: string): Team {
        const team = new Team(name, []);
        this.teams.push(team);
        return team;
    }

    public getTeam(name: string): Team | undefined {
        return this.teams.find(team => team.name === name);
    }

    public addEntityToTeam(teamName: string, entity: Entity): boolean {
        const team = this.getTeam(teamName);
        if (team) {
            team.addMembers(entity);
            return true;
        }
        return false;
    }

    public getTeamState(): TeamState[] {
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