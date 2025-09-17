import { Players, StarterGui } from "@rbxts/services";
import BattleClient from "shared/class/battle/Client";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER } from "shared/class/battle/types";
import { clientRemotes } from "shared/remote";

StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);

clientRemotes.createClient.connect(async (config) => {
    const { width, height, worldCenter, teamMap } = config;
    // if (teamMap === undefined) return;

    const clientSide = await BattleClient.Create({
        width: width ?? DEFAULT_WIDTH,
        height: height ?? DEFAULT_HEIGHT,
        worldCenter: worldCenter ?? DEFAULT_WORLD_CENTER,
        client: Players.LocalPlayer,
    });
})
