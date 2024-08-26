import Roact from "@rbxts/roact";
import { ContentProvider, Players, ReplicatedFirst, ReplicatedStorage, Workspace } from "@rbxts/services";
import { Battle } from "shared/class/Battle";
import ButtonElement, { ButtonElementProps } from "./components/button";
import ButtonFrameElement from "./components/button-frame";
import MenuFrameElement from "./components/menu";
import TitleElement from "./components/title";

//#region 1. LOADING
// Wait for the game to load
ReplicatedFirst.RemoveDefaultLoadingScreen();
// while (!game.IsLoaded()) wait();

const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui");
const assets = game.GetDescendants();
const numberOfAssets = assets.size();

let loadedAssets = 0;  // Track the number of assets loaded

// Function to update the loading screen
function updateLoadingScreen(loadedAssets: number) {
    Roact.update(
        loadingScreen,
        <MenuFrameElement transparency={0} zIndex={5}>
            <TitleElement text={`Loading ${loadedAssets}/${numberOfAssets} Assets...`} />
        </MenuFrameElement>
    );
}

// Initial loading screen mount
const loadingScreen = Roact.mount(
    <MenuFrameElement transparency={0}>
        <TitleElement text={`Loading 0/${numberOfAssets} Assets...`} />
    </MenuFrameElement>,
    playerGui // Mounting the UI in PlayerGui
);

// Preload assets and update the loading screen title
print("Preloading assets");
for (let i = 0; i < numberOfAssets; i++) {
    const thread = task.spawn(() => {
        const asset = assets[i];
        ContentProvider.PreloadAsync([asset]);
        loadedAssets += 1;
        updateLoadingScreen(loadedAssets);  // Update the loading screen after each asset is loaded
    })
}

// Wait for all assets to be preloaded
while (loadedAssets < numberOfAssets) wait();
print("Preloading complete");

// Remove the loading screen after preloading is complete
Roact.unmount(loadingScreen);
//#endregion

//#region 2. MAIN MENU
const loadCharacterEvent = ReplicatedStorage.WaitForChild("LoadCharacterEvent") as RemoteEvent;

// Setup the camera
function mainMenuCameraSetup() {
    const currentCamera = Workspace.CurrentCamera;
    if (!currentCamera) {
        throw "No current camera found";
    }
    const camPos = Workspace.WaitForChild("campos1") as Part;
    assert(camPos.IsA("Part"), "campos1 is not a part");
    currentCamera.CameraType = Enum.CameraType.Scriptable;
    currentCamera.CFrame = camPos.CFrame;
    print(currentCamera);
}

// Setup the main menu
function enterPlayground() {
    if (Workspace.CurrentCamera) {
        Workspace.CurrentCamera.CameraType = Enum.CameraType.Custom;
    }
    loadCharacterEvent.FireServer();
}
function enterBattle() {
    const battle = Battle.Create({
        size: 4,
        width: 5,
        height: 5,
        camera: game.Workspace.CurrentCamera!,
        center: new Vector2(100, 100),
        teamMap: {
            '1': [Players.LocalPlayer],
            '2': [Players.LocalPlayer],
            '3': [Players.LocalPlayer],
        }
    });
}
function mainMenuSetup() {
    const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;
    const mainMenuButtons: Omit<ButtonElementProps, "size" | "position">[] = [
        {
            text: "Play",
            onclick: () => {
                Roact.unmount(mainMenu);
                enterPlayground();
            },
        },
        {
            text: "Battle",
            onclick: () => {
                Roact.unmount(mainMenu);
                enterBattle();
            }
        }
    ];
    if (mainMenuButtons.size() === 0) {
        warn("No buttons provided");
        return;
    }

    const mainMenu = Roact.mount(
        <MenuFrameElement>
            <TitleElement text="Epic Colndir Game!!!" />
            <ButtonFrameElement>
                {mainMenuButtons.map((button, index) => (
                    <ButtonElement
                        Key={index}
                        position={index * 1 / mainMenuButtons.size()}
                        size={1 / mainMenuButtons.size()}
                        onclick={button.onclick}
                        text={button.text}
                    />
                ))}
            </ButtonFrameElement>
        </MenuFrameElement>,
        playerGui // Mounting the UI in PlayerGui
    );

    return mainMenu;
}

print("Initializing main menu");
mainMenuCameraSetup();
mainMenuSetup();
//#endregion


