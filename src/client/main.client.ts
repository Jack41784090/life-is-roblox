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

// ===
// Place in a server-side script, e.g., src/server/riggingDebugger.ts
import { Workspace } from "@rbxts/services";

// Target the model in the Workspace
const modelFolder = Workspace.FindFirstChild("_") as Model;
const model = modelFolder?.FindFirstChild("main_v4") as Model;

if (model) {
    const upperTorso = model.FindFirstChild("UpperTorso");

    if (upperTorso && upperTorso.IsA("BasePart")) {
        // Check if the essential shoulder joints exist
        const rightShoulder = upperTorso.FindFirstChild("RightShoulder") as Motor6D;
        const leftShoulder = upperTorso.FindFirstChild("LeftShoulder") as Motor6D;

        if (rightShoulder && leftShoulder) {
            print("SUCCESS: Shoulder joints (RightShoulder, LeftShoulder) found.");

            // Optional: Verify the connections are correct
            const rightUpperArm = model.FindFirstChild("RightUpperArm");
            if (rightShoulder.Part0 === upperTorso && rightShoulder.Part1 === rightUpperArm) {
                print("RightShoulder connection is correct.");
            } else {
                warn("WARNING: RightShoulder connection is incorrect.");
            }
        } else {
            warn("ERROR: Model is not rigged correctly. Shoulder Motor6Ds are missing.");
        }
    } else {
        warn("ERROR: Model does not contain an UpperTorso.");
    }
}
