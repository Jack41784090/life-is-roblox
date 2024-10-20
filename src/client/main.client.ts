import { StarterGui } from "@rbxts/services";
import * as Battle from "shared/class/Battle";
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

