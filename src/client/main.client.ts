import { Players, StarterGui } from "@rbxts/services";
import ClientSide from "shared/class/battle/ClientSide";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER } from "shared/class/battle/types";
import remotes from "shared/remote";
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);

remotes.battle.createClient.connect(async (config) => {
    const { width, height, worldCenter, teamMap } = config;
    if (teamMap === undefined) return;

    print("ClientBegin", config);

    const clientSide = await ClientSide.Create({
        width: width ?? DEFAULT_WIDTH,
        height: height ?? DEFAULT_HEIGHT,
        worldCenter: worldCenter ?? DEFAULT_WORLD_CENTER,
        camera: game.Workspace.CurrentCamera!,
        client: Players.LocalPlayer,
    });
})
