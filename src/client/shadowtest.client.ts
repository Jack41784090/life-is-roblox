import { ShadowMachine } from "shared/class/ShadowMachine";

const testPart = game.Workspace.WaitForChild("Test2").WaitForChild("New Plain").WaitForChild("obj") as Part;
const shadowMachine = new ShadowMachine(testPart);
shadowMachine.updateShadow(2);
