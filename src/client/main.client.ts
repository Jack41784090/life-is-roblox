import { getPlayer, onInput } from "shared/func";

const part: Part = game.Workspace.WaitForChild("SpawnLocation") as Part;
part.Touched.Connect((other: BasePart) => {
    print("Touched: " + other.Name);
    other.Color = Color3.fromRGB(255, 0, 0);
})

import Grid from "shared/class/Grid";
const grid = new Grid(new Vector2(10, 10), new Vector2(5, 5), 10);
grid.materialise()

onInput(Enum.UserInputType.Keyboard, (input: InputObject) => {
    if (input.KeyCode === Enum.KeyCode.E) {
        const player = getPlayer();
        if (player?.Character) {
            const char = player.Character;
            const humanoid = char.WaitForChild("Humanoid") as Humanoid;
            humanoid.TakeDamage(1);
        }
    }
})


const starterGUI = game.GetService("StarterGui");
starterGUI.SetCoreGuiEnabled(Enum.CoreGuiType.All, false);
starterGUI.SetCoreGuiEnabled(Enum.CoreGuiType.SelfView, false);

// find all cells and change height
function iterate() {
    const mappedCells = grid.cells.map(cell => {
        return cell.raiseHeight(math.random(1, 10))
    })

    print(mappedCells);
    Promise.all(mappedCells)
        .then(() => {
            print("All cells raised");
            iterate();
        })
        .catch((err: unknown) => {
            print("Error: " + err);
        });
}

wait(3)
iterate();