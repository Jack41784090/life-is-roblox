import { Players, StarterGui } from "@rbxts/services";
import ClientSide from "shared/class/battle/Client";
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

// const gs = new ClientGameState({
//     width: DEFAULT_WIDTH,
//     worldCenter: DEFAULT_WORLD_CENTER
// })
// gs.createEntity('the french', {
//     name: 'the french',
//     qr: new Vector2(0, 0),
//     playerID: 0,
//     stats: getDummyStats(),
//     hip: 0,
//     pos: 0,
//     org: 0,
//     sta: 0,
//     mana: 0
// })
// gs.createEntity('das deutsche', {
//     name: 'das deutsche',
//     qr: new Vector2(0, 0),
//     playerID: 1,
//     stats: getDummyStats(),
//     hip: 0,
//     pos: 0,
//     org: 0,
//     sta: 0,
//     mana: 0,
//     // weapon: new Weapon({
//     // })
// })
// const aa: AttackAction = {
//     type: ActionType.Attack,
//     executed: false,
//     by: 1,
//     against: 0,
//     ability: UNIVERSAL_PHYS.get('4-Slash-Combo')!,
//     clashResult: getDummyClashResult(),
// }
// const cs = new CombatSystem(gs)
// cs.resolveAttack(aa);

