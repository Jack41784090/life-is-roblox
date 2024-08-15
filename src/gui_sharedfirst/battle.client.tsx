import Roact from "@rbxts/roact";
import { Players, ReplicatedStorage } from "@rbxts/services";
import MenuFrameElement from "./components/menu";
import ReadinessBarElement from "./components/readinessBar";

// Setup the main menu
function battleGUISetup() {
    const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;

    const ui = Roact.mount(
        <MenuFrameElement transparency={1}>
            <ReadinessBarElement />
        </MenuFrameElement>,
        playerGui // Mounting the UI in PlayerGui
    );

    return ui;
}

const openBattleGUIEvent = ReplicatedStorage.WaitForChild("OpenBattleGUI") as BindableEvent;
openBattleGUIEvent.Event.Connect(() => {
    battleGUISetup();
});
