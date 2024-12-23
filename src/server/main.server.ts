import { Players } from "@rbxts/services";
import Battle from "shared/class/battle";
import HexGrid from "shared/class/battle/Hex/Grid";
import remotes from "shared/remote";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, DEFAULT_WORLD_CENTER } from "shared/types/battle-types";
import { disableCharacter, enableCharacter } from "shared/utils";

Players.PlayerAdded.Connect((player) => {
    player.CharacterAppearanceLoaded.Connect((character) => {
        disableCharacter(character);

        // Listen for the remote event to re-enable interactivity
        remotes.loadCharacter.connect((requestingPlayer) => {
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
// hexGrid.materialise();

print("Connecting battle_Start")
remotes.battle.request.connect((p) => {
    // print("Battle Start", p);
    Battle.Create({
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        worldCenter: DEFAULT_WORLD_CENTER,
        teamMap: {
            'team1': [p],
        }
    })
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
