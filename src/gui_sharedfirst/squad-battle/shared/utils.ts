import { SquadEntityInSquadLocation } from "squad-battle/type";

export const getTeamColor = (teamName: string): Color3 => {
    const colors = [
        new Color3(0.2, 0.6, 1),    // Blue
        new Color3(1, 0.3, 0.3),    // Red  
        new Color3(0.3, 1, 0.3),    // Green
        new Color3(1, 1, 0.3),      // Yellow
        new Color3(1, 0.3, 1),      // Magenta
        new Color3(0.3, 1, 1),      // Cyan
    ];

    if (teamName === "player") {
        return new Color3(0.2, 0.6, 1);
    } else if (teamName === "enemy") {
        return new Color3(1, 0.3, 0.3);
    }

    // Fallback to index-based coloring for other team names
    const teamNames = ["player", "enemy"];
    const index = teamNames.indexOf(teamName);
    if (index >= 0) {
        return colors[index % colors.size()];
    }

    return colors[0]; // Default to blue
};

export const getLocationText = (location: SquadEntityInSquadLocation): string => {
    switch (location) {
        case SquadEntityInSquadLocation.front: return "FRONT";
        case SquadEntityInSquadLocation.middle: return "MID";
        case SquadEntityInSquadLocation.back: return "BACK";
        default: return "UNKNOWN";
    }
};

export const getLocationColor = (location: SquadEntityInSquadLocation): Color3 => {
    switch (location) {
        case SquadEntityInSquadLocation.front: return new Color3(1, 0.5, 0.5);
        case SquadEntityInSquadLocation.middle: return new Color3(1, 1, 0.5);
        case SquadEntityInSquadLocation.back: return new Color3(0.5, 0.5, 1);
        default: return new Color3(0.7, 0.7, 0.7);
    }
};