import { Players, StarterGui } from "@rbxts/services";
import ClientSide from "shared/class/battle/ClientSide";
import { Cutscene } from "shared/class/scene/Cutscene";
import { CutsceneScript } from "shared/class/scene/Cutscene/Script";
import { CutsceneSet } from "shared/class/scene/Cutscene/Set";
import { Trigger } from "shared/class/scene/Cutscene/Trigger";
import { CutsceneAction } from "shared/class/scene/Cutscene/types";
import remotes from "shared/remote";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER } from "shared/types/battle-types";
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

const csscript = new CutsceneScript({
    triggerMap: [
        [1, new Trigger('modelid', CutsceneAction.action1, false, false)],
    ]
})
const csset = new CutsceneSet({
    location: new Vector3(),
    modelID: 'set-konigsberg'
}, [], [])

const cs = new Cutscene({
    script: csscript,
    set: csset,
})

cs.playFromStart();
