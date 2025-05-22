import { TeamState } from "shared/class/battle/types";
import Logger from "shared/utils/Logger";
import FightingStyle from "../../Systems/CombatSystem/FightingStyle";
import { AGGRESSIVE_STANCE, BASIC_STANCE, DEFENSIVE_STANCE } from "../../Systems/CombatSystem/FightingStyle/const";
import Entity from "../Entity";
import { EntityConfig, EntityState } from "../Entity/types";
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

    /**
     * Converts an EntityState to EntityConfig for entity creation
     * This handles the conversion of FightingStyleState[] to FightingStyle[]
     */
    private convertStateToConfig(entityState: EntityState): EntityConfig {
        // Create base config with required properties
        const config: EntityConfig = {
            playerID: entityState.playerID,
            stats: { ...entityState.stats },
            qr: entityState.qr,
            hip: entityState.hip,
            pos: entityState.pos,
            org: entityState.org,
            sta: entityState.sta,
            mana: entityState.mana,
            name: entityState.name,
            team: entityState.team,
            weapon: entityState.weapon,
            armour: entityState.armour,
        };

        // Map fighting styles by name to standard instances
        // This is a simplified approach that uses predefined stances
        // A more complete approach would reconstruct styles from state
        const fightingStyles: FightingStyle[] = [];

        if (entityState.fightingStyles && entityState.fightingStyles.size() > 0) {
            for (const styleState of entityState.fightingStyles) {
                // Try to find a matching predefined style or create a basic one
                if (styleState.name === "Basic Stance") {
                    fightingStyles.push(BASIC_STANCE());
                } else if (styleState.name === "Aggressive Stance") {
                    fightingStyles.push(AGGRESSIVE_STANCE());
                } else if (styleState.name === "Defensive Stance") {
                    fightingStyles.push(DEFENSIVE_STANCE());
                } else {
                    // Default to basic stance if no match
                    this.logger.warn(`Unknown fighting style: ${styleState.name}, using Basic Stance instead`);
                    fightingStyles.push(BASIC_STANCE());
                }
            }
        }

        if (fightingStyles.size() > 0) {
            config.fightingStyles = fightingStyles;
        }

        return config;
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

    public addEntityToTeam(teamName: string, entity: Entity, createNew = true, switchTeam = false): boolean {
        const currentTeam = this.getTeam(entity.team);
        if (switchTeam && entity.team && entity.team !== teamName) {
            if (currentTeam) {
                currentTeam.removeMembers(entity.playerID);
            }
        }

        const team = this.getTeam(teamName);
        if (team) {
            team.addMembers(entity);
            entity.team = teamName;
            return true;
        } else if (createNew) {
            const newTeam = this.createTeam(teamName);
            newTeam.addMembers(entity);
            entity.team = teamName;
            return true;
        }
        else {
            this.logger.warn(`Failed to add entity to team: ${teamName} does not exist and createNew is false`);
            currentTeam?.addMembers(entity);
            return false;
        }
    }

    public getTeamStates(): TeamState[] {
        return this.teams.map(team => ({
            name: team.name,
            members: team.members.map(entity => entity.state()),
        }));
    }

    private updateExistingTeam(existingTeam: Team, teamState: TeamState, entityManager: EntityManager): void {
        this.logger.debug(`Updating existing team: ${teamState.name}`);
        // Update existing team members
        // Implementation depends on how you want to handle updates
        for (const memberState of teamState.members) {
            const existingMember = existingTeam.members.find(member => member.playerID === memberState.playerID);
            if (existingMember) {
                this.logger.debug(`Updating member: ${memberState.name} (${memberState.playerID})`);
                entityManager.updateEntity(memberState);
            } else {
                this.logger.debug(`Adding new member: ${memberState.name} (${memberState.playerID})`);
                const entityConfig = this.convertStateToConfig(memberState);
                const newMember = entityManager.createEntity(entityConfig);
                existingTeam.addMembers(newMember);
                newMember.team = existingTeam.name;
            }
        }
    }

    private updateNewTeam(teamState: TeamState, entityManager: EntityManager): void {
        this.logger.debug(`Creating new team: ${teamState.name}`);
        const newTeam = this.createTeam(teamState.name);
        for (const memberState of teamState.members) {
            this.logger.debug(`Adding member: ${memberState.name} (${memberState.playerID})`);
            const entityConfig = this.convertStateToConfig(memberState);
            const newMember = entityManager.createEntity(entityConfig);
            newTeam.addMembers(newMember);
            newMember.team = newTeam.name;
        }
    }

    public updateTeams(teamStates: TeamState[], entityManager: EntityManager): void {
        this.logger.debug("Updating teams with new states", teamStates);

        for (const teamState of teamStates) {
            const existingTeam = this.getTeam(teamState.name);
            if (existingTeam) {
                this.updateExistingTeam(existingTeam, teamState, entityManager);
            } else {
                this.updateNewTeam(teamState, entityManager);
            }
        }

    }

    public getAllTeams(): Team[] {
        return this.teams;
    }
}