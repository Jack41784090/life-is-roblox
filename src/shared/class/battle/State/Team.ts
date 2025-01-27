import { Players } from "@rbxts/services";
import Entity from "./Entity";

export default class Team {
    name: string;
    members: Entity[];

    constructor(name: string, members: Entity[]) {
        this.name = name;
        this.members = members;
    }

    addMembers(...members: Entity[]) {
        for (const member of members) {
            if (this.members.every(m => m.stats && m.stats.id !== member.stats.id)) {
                this.members.push(member);
            }
        }
    }

    players() {
        const playerSet = new Set<Player>();
        for (const entity of this.members) {
            const player = Players.GetPlayerByUserId(entity.playerID);
            if (player) {
                playerSet.add(player);
            }
        }
        return playerSet;
    }
}
