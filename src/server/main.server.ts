import { Players, ReplicatedStorage } from "@rbxts/services";
import HexGrid from "shared/class/HexGrid";
import { disableCharacter, enableCharacter } from "shared/utils";

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


const hexGrid = new HexGrid({
    radius: 5,
    center: new Vector2(15, 15),
    size: 10,
    name: "FunGrid"
});
hexGrid.materialise();

// find all cells and change height
wait(3)
// const grid = new Grid({ widthheight: new Vector2(10, 10), center: new Vector2(0, 0), size: 10, name: "FunGrid" });
// grid.materialise()
// function iterate() {
//     const mappedCells = grid.cells.map(cell => {
//         return cell.raiseHeight(math.random(1, 10))
//     })
//     Promise.all(mappedCells)
//         .then(() => iterate())
//         .catch((err: unknown) => {
//             print("Error: " + err);
//         });
// }
// iterate();

// Pathfinding.Start({
//     grid: grid,
//     start: new Vector2(0, 0),
//     dest: new Vector2(9, 9),
//     verbose: true,
// })
