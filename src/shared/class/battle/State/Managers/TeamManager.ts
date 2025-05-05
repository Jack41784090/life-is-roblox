import { TeamState } from "shared/types/battle-types";
import Logger from "shared/utils/Logger";
import Entity from "../Entity";
import Team from "../Team";
import { EntityManager } from "./EntityManager";

export class TeamManager {
    private teams: Team[] = [];
    private logger = Logger.createContextLogger("TeamManager");

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
        this.logger.debug("Getting team", name, this.teams);
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

    public getTeamStates(): TeamState[] {
        return this.teams.map(team => ({
            name: team.name,
            members: team.members.map(entity => entity.state()),
        }));
    }

    public updateTeams(teamStates: TeamState[], entityManager: EntityManager): void {
        this.logger.debug("Updating teams with new states", teamStates);

        for (const teamState of teamStates) {
            const existingTeam = this.getTeam(teamState.name);
            if (existingTeam) {
                this.logger.debug(`Updating existing team: ${teamState.name}`);
                // Update existing team members
                // Implementation depends on how you want to handle updates
                for (const memberState of teamState.members) {
                    const existingMember = existingTeam.members.find(member => member.playerID === memberState.playerID);
                    if (existingMember) {
                        this.logger.debug(`Updating member: ${memberState.name} (${memberState.playerID})`);
                        existingMember.update(memberState);
                    } else {
                        this.logger.debug(`Adding new member: ${memberState.name} (${memberState.playerID})`);
                        const newMember = entityManager.createEntity(memberState);
                        existingTeam.addMembers(newMember);
                        newMember.team = existingTeam.name;
                    }
                }
            } else {
                this.logger.debug(`Creating new team: ${teamState.name}`);
                const newTeam = this.createTeam(teamState.name);
                for (const memberState of teamState.members) {
                    this.logger.debug(`Adding member: ${memberState.name} (${memberState.playerID})`);
                    const newMember = entityManager.createEntity(memberState);
                    newTeam.addMembers(newMember);
                    newMember.team = newTeam.name;
                }
            }
        }

    }

    public getAllTeams(): Team[] {
        return this.teams;
    }
}