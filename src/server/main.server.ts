import { Players } from "@rbxts/services";
import { Battle } from "shared/class/battle/Battle";
import HexGrid from "shared/class/battle/system/hex/HexGrid";
import { disableCharacter, enableCharacter } from "shared/utils";
import { remoteEventsMap } from "shared/utils/events";

const loadCharacterEvent = remoteEventsMap["LoadCharacterEvent"]

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

remoteEventsMap["StartBattle"].OnServerEvent.Connect(() => {
    const battle = Battle.System.Create({
        width: 5,
        height: 5,
        camera: game.Workspace.CurrentCamera!,
        worldCenter: new Vector3(150, 0, 150),
        teamMap: {
            '1': [Players.LocalPlayer],
            '2': [Players.LocalPlayer],
            '3': [Players.LocalPlayer],
        }
    });
})

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
