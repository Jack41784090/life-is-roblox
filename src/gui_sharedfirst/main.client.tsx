import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import { ContentProvider, Lighting, Players, ReplicatedFirst, ReplicatedStorage, RunService, Workspace } from "@rbxts/services";
import { setInterval } from "@rbxts/set-timeout";
import Explorer from "shared/class/explorer";
import Scene from "shared/class/scene/Scene";
import { DialogueExpression } from "shared/class/scene/types";
import { GuiTag, PlaceName } from "shared/const";
import remotes from "shared/remote";
import GuiMothership from "./new_components/main";
import MainMenuElement from "./new_components/menu_ui";
import WaitingRoomElement from "./new_components/waiting_room";

//#region 1. LOADING
ReplicatedFirst.RemoveDefaultLoadingScreen();
while (!game.IsLoaded()) wait();

const prioritiseAssets = ReplicatedStorage.GetDescendants();
const numberOfAssets = prioritiseAssets.size();

let loadedAssetCount = 0;
const progressAtom = atom(0);
// GuiMothership.mount("LoadingScreen", <LoadingScreenElement progress={progressAtom} />);

const threads: thread[] = [];
// // print("Preloading assets");
for (let i = 0; i < numberOfAssets; i++) {
    const thread = task.spawn(() => {
        const asset = prioritiseAssets[i];
        ContentProvider.PreloadAsync([asset]);
        loadedAssetCount++;
    });
    threads.push(thread);
}

const checkProgress = setInterval(() => {
    // print(`${loadedAssetCount / numberOfAssets * 100}% loaded`);
    progressAtom(loadedAssetCount / numberOfAssets);
}, .1);

while (progressAtom() < 1) wait();
// clearInterval(checkProgress);
// print("Preloading complete");
// GuiMothership.unmount("LoadingScreen");
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
}

// Setup the main menu
function enterPlayground() {
    const cam = Workspace.CurrentCamera;
    assert(cam, "No current camera")

    // place
    const explorer = Explorer.getInstance();

    cam.CameraType = Enum.CameraType.Scriptable;
    const player = Players.LocalPlayer;
    const character = explorer.beginExplore(PlaceName.Konigsberg);
    // remotes.loadCharacter(); explorer.beginExplore(PlaceName.City);
    // const character = player.Character || player.CharacterAdded.Wait()[0];
    const humanoidRootPart = character.WaitForChild("HumanoidRootPart") as Part;

    // Set the camera position and make it look at the player along the Z axis
    RunService.RenderStepped.Connect(() => {
        const cameraPosition = humanoidRootPart.Position.add(new Vector3(24, 10, 0));
        cam.CFrame = new CFrame(cameraPosition, humanoidRootPart.Position);
    })

    // depth of field
    const blur = new Instance('DepthOfFieldEffect');
    blur.Parent = cam;
    blur.FarIntensity = .7;
    blur.FocusDistance = 45;
    blur.InFocusRadius = 25;
    blur.NearIntensity = 1;

    // fov
    cam.FieldOfView = 50;

    // following emitter 
    const emitter = ReplicatedStorage.WaitForChild("EMITTER") as Part;
    emitter.Parent = character;

    // Runtime
    RunService.RenderStepped.Connect(dt => {
        // time
        Lighting.ClockTime += dt / 60;

        // emitter
        if (character.PrimaryPart) emitter.CFrame = character.PrimaryPart.CFrame.add(new Vector3(0, -5, 0));
    })

}
function enterBattle() {
    print("Entering battle");
    remotes.battle.request();
}
function enterStory() {
    const scene = new Scene({
        name: "Test Scene",
        hasCover: true
    });
    scene.addDialogue({
        text: 'Hello, World!',
        speaker: 'NPC',
        expression: DialogueExpression.Neutral,
        alignment: 'top',
        effects: []
    }, {
        text: 'Hello back',
        speaker: 'NPC2',
        expression: DialogueExpression.Neutral,
        alignment: 'center',
        effects: []
    }, {
        text: 'Goodbye',
        speaker: '',
        expression: DialogueExpression.Neutral,
        alignment: 'bottom',
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
                    GuiMothership.unmount("MainMenu");
                    GuiMothership.unmount(GuiTag.WaitingRoom);;
                    enterPlayground();
                },
            },
            {
                text: "Battle",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    enterBattle();
                }
            },
            {
                text: "Story",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    enterStory();
                }
            },
            {
                text: "Multiplayer",
                onClick: () => {
                    GuiMothership.unmount("MainMenu");
                    remotes.battle.requestRoom();
                }
            }
        ];

    GuiMothership.mount("MainMenu", <MainMenuElement title="Condor" buttons={mainMenuButtons} />);
}

remotes.battle.ui.unmount.connect(tag => GuiMothership.unmount(tag));
remotes.battle.ui.startRoom.connect(s => {
    // print("Start Room", s);
    GuiMothership.mount(GuiTag.WaitingRoom, <WaitingRoomElement
        players={s}
        readyButtonClicked={() => {
            enterBattle();
        }}
    />)
})


mainMenuCameraSetup();
// enterBattle();
mainMenuSetup();
//#endregion

