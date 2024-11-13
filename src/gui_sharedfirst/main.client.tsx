import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { ContentProvider, Players, ReplicatedFirst, Workspace } from "@rbxts/services";
import { setInterval } from "@rbxts/set-timeout";
import * as Battle from "shared/class/battle";
import Scene from "shared/class/Scene";
import { DialogueExpression } from "shared/types/scene-types";
import { remoteEventsMap } from "shared/utils/events";
import LoadingScreenElement from "./new_components/loading";
import MainMenuElement from "./new_components/menu_ui";

//#region 1. LOADING
ReplicatedFirst.RemoveDefaultLoadingScreen();
// while (!game.IsLoaded()) wait();

const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui");
const assets = game.GetDescendants();
const numberOfAssets = assets.size();

let loadedAssetCount = 0;
const progressAtom = atom(0);
const loadingScreen: ReactRoblox.Root = createRoot(playerGui);
loadingScreen.render(
    createPortal(<screengui IgnoreGuiInset={true} ><LoadingScreenElement progress={progressAtom} /></screengui>, playerGui)
);

const threads: thread[] = [];
print("Preloading assets");
for (let i = 0; i < numberOfAssets; i++) {
    const thread = task.spawn(() => {
        const asset = assets[i];
        ContentProvider.PreloadAsync([asset]);
        loadedAssetCount++;
    })
    threads.push(thread);
}

const checkProgress = setInterval(() => {
    print(`${loadedAssetCount / numberOfAssets * 100}% loaded`);
    progressAtom(loadedAssetCount / numberOfAssets);
}, .1);

// Wait for all assets to be preloaded
while (progressAtom() < 1) wait();
checkProgress();
print("Preloading complete");

// Remove the loading screen after preloading is complete
if (loadingScreen) {
    print("Unmounting loading screen");
    loadingScreen.unmount();
}
//#endregion

//#region 2. MAIN MENU


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
    const loadCharacterEvent = remoteEventsMap["LoadCharacterEvent"] as RemoteEvent;
    loadCharacterEvent.FireServer();
}
function enterBattle() {
    Battle.remoteEvent_Start.FireServer();
}
function enterStory() {
    const scene = new Scene('scene');
    scene.addDialogue({
        text: 'Hello, World!',
        speaker: 'NPC',
        expression: DialogueExpression.Neutral,
        effects: []
    }, {
        text: 'Hello back',
        speaker: 'NPC2',
        expression: DialogueExpression.Neutral,
        effects: []
    }, {
        text: 'Goodbye',
        speaker: '',
        expression: DialogueExpression.Neutral,
        effects: []
    })
    scene.playFromBeginning();
}
function mainMenuSetup() {
    print("Setting up main menu");
    const mainMenuButtons: Omit<{
        text: string;
        size: number;
        position: number;
        transparency?: number;
        onClick: () => void;
    }, "size" | "position">[] = [
            {
                text: "Play",
                onClick: () => {
                    mainMenu.unmount();
                    enterPlayground();
                },
            },
            {
                text: "Battle",
                onClick: () => {
                    mainMenu.unmount();
                    enterBattle();
                }
            },
            {
                text: "Story",
                onClick: () => {
                    mainMenu.unmount();
                    enterStory();
                }
            }
        ];

    const mainMenu = createRoot(new Instance("Folder"));
    mainMenu.render(
        createPortal(
            <screengui key={"MainMenuScreengui"} IgnoreGuiInset={true}>
                <MainMenuElement title="Condor" buttons={mainMenuButtons} />
            </screengui>,
            playerGui)
    );

    return mainMenu;
}


print("Initializing main menu");
mainMenuCameraSetup();
mainMenuSetup();
//#endregion

