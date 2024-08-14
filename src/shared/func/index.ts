
const service_Players = game.GetService("Players");
const serivce_DataStore = game.GetService("DataStoreService");
const service_Input = game.GetService("UserInputService");
const service_Tween = game.GetService("TweenService");

export function getPlayer(id?: number): Player | undefined {
    return id ? service_Players.GetPlayerByUserId(id!) : service_Players.LocalPlayer;
}

export function getDatastore(name: string): DataStore {
    return serivce_DataStore.GetDataStore(name);
}

export function onInput(inputType: Enum.UserInputType, callback: (input: InputObject) => void) {
    service_Input.InputBegan.Connect((input: InputObject) => {
        if (input.UserInputType === inputType) {
            callback(input);
        }
    });
}

export function getTween(object: Instance, info: TweenInfo, goal: { [key: string]: any }) {
    return service_Tween.Create(object, info, goal);
}

export function enableCharacter(character: Model) {
    for (const descendant of character.GetDescendants()) {
        if (descendant.IsA("BasePart")) {
            descendant.CanCollide = true;  // Enable collisions
            descendant.Anchored = false;   // Unanchor parts to re-enable physics
            if (descendant.Name !== "HumanoidRootPart")
                descendant.Transparency = 0;   // Make the part visible
        } else if (descendant.IsA("Humanoid")) {
            descendant.PlatformStand = false; // Re-enable humanoid physics interactions
        } else if (descendant.IsA("Decal") || descendant.IsA("Texture")) {
            descendant.Transparency = 0;   // Make decals and textures visible
        }
    }
}

export function disableCharacter(character: Model) {
    for (const descendant of character.GetDescendants()) {
        if (descendant.IsA("BasePart")) {
            descendant.CanCollide = false; // Disable collisions
            descendant.Anchored = true;    // Optionally anchor parts to disable physics
            descendant.Transparency = 1;   // Make the part invisible
        } else if (descendant.IsA("Humanoid")) {
            descendant.PlatformStand = true; // Prevent humanoid physics interactions
        } else if (descendant.IsA("Decal") || descendant.IsA("Texture")) {
            descendant.Transparency = 1;   // Make decals and textures invisible
        }
    }
}

// export function attack(
//     attacker: Entity | iEntity,
//     target: Entity | iEntity,
//     value: number,
//     type: keyof iEntityStats = 'hp',
//     apply = false
// ) {
//     // const ability = this.getAction();
//     // const targetAbility = target.getAction();

//     const vattacker =
//         attacker instanceof Entity ?
//             apply ?
//                 attacker.applyCurrentStatus() :
//                 attacker.virtual() :
//             attacker;
//     const vTarget =
//         target instanceof Entity ?
//             apply ?
//                 target.applyCurrentStatus() :
//                 target.virtual() :
//             target;


//     return {
//         vattacker,
//         vTarget,
//         value,
//     }
// }
