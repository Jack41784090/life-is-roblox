import Roact from "@rbxts/roact";
import { Players, ReplicatedStorage, Workspace } from "@rbxts/services";
import { Battle } from "shared/class/Battle";
import ButtonElement, { ButtonElementProps } from "./components/button";
import ButtonFrameElement from "./components/button-frame";
import MenuFrameElement from "./components/menu";
import TitleElement from "./components/title";

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
function mainMenuSetup() {
    const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;
    const mainMenuButtons: Omit<ButtonElementProps, "size" | "position">[] = [
        {
            text: "Play",
            onclick: () => {
                if (Workspace.CurrentCamera) {
                    Workspace.CurrentCamera.CameraType = Enum.CameraType.Custom;
                }
                Roact.unmount(mainMenu);
                loadCharacterEvent.FireServer();
            },
        },
        {
            text: "Battle",
            onclick: () => {
                Roact.unmount(mainMenu);
                const battle = new Battle({
                    size: 4,
                    width: 5,
                    height: 5,
                    camera: game.Workspace.CurrentCamera!,
                    center: new Vector2(100, 100),
                    teamMap: {
                        '1': [Players.LocalPlayer]
                    }
                })
                battle.spawn()
            }
        }
    ];
    if (mainMenuButtons.size() === 0) {
        throw "No buttons provided";
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

// Main function to initialize the menu and camera
function initializeMainMenu() {
    print("Initializing main menu");
    mainMenuCameraSetup();
    mainMenuSetup();
}

// Run when the player joins the game
Players.LocalPlayer.CharacterAdded.Connect(() => {
    initializeMainMenu();
});

initializeMainMenu();
