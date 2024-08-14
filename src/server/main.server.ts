import { Players, ReplicatedStorage } from "@rbxts/services";
import Grid from "shared/class/Grid";
import { disableCharacter, enableCharacter } from "shared/func";

const loadCharacterEvent = ReplicatedStorage.WaitForChild("LoadCharacterEvent") as RemoteEvent;

Players.PlayerAdded.Connect((player) => {
    player.CharacterAppearanceLoaded.Connect((character) => {
        disableCharacter(character);

        // Listen for the remote event to re-enable interactivity
        loadCharacterEvent.OnServerEvent.Connect((requestingPlayer) => {
            if (requestingPlayer === player && character) {
                enableCharacter(character);
            }
        });
    });
});

// find all cells and change height
const grid = new Grid(new Vector2(10, 10), new Vector2(0, 0), 10, "FunGrid");
grid.materialise()
function iterate() {
    const mappedCells = grid.cells.map(cell => {
        return cell.raiseHeight(math.random(1, 10))
    })
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
