import { StarterGui } from "@rbxts/services";
import remotes from "shared/remote";
StarterGui.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);

remotes.battle_ClientBegin.connect((config) => {
    const { width, height, worldCenter, teamMap } = config;
    if (teamMap === undefined) return;

    // width: width ?? Battle.DEFAULT_WIDTH,
    // height: height ?? Battle.DEFAULT_HEIGHT,
    // worldCenter: worldCenter ?? Battle.DEFAULT_WORLD_CENTER,
    // teamMap: teamMap,
    // camera: game.Workspace.CurrentCamera!
})

