import { StarterGui } from "@rbxts/services";
import { Battle } from "shared/class/battle/Battle";
import { remoteEventsMap } from "shared/utils/events";
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);

Battle.remoteEvent_Start.OnClientEvent.Connect((config: Partial<Battle.Config>) => {
    const { width, height, worldCenter, teamMap } = config;
    if (teamMap === undefined) return;
    const system = Battle.System.Create({
        width: width ?? Battle.DEFAULT_WIDTH,
        height: height ?? Battle.DEFAULT_HEIGHT,
        worldCenter: worldCenter ?? Battle.DEFAULT_WORLD_CENTER,
        teamMap: teamMap,
        camera: game.Workspace.CurrentCamera!
    });
})
