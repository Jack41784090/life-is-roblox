import { ShadowMachine } from "shared/class/ShadowMachine";

const testPart = game.Workspace.WaitForChild("Test2").WaitForChild("New Plain").WaitForChild("obj") as Part;
const shadowMachine = new ShadowMachine(testPart, 1);

print(shadowMachine.equation(0.25));

shadowMachine.shear();
// let timer = 0;
// RunService.RenderStepped.Connect((dt) => {
//     // Update the timer and loop it between 0 and 1
//     timer = (timer + dt) % 1;
//     print(`Timer: ${timer}`);
//     shadowMachine.equation(timer);
// });
