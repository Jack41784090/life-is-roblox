import { DataStoreService, Players, ReplicatedStorage, TweenService, UserInputService, Workspace } from "@rbxts/services";
import Grid from "shared/class/Grid";
import { EntityStats, iAbility } from "shared/types/battle-types";

const remoteEvents = ReplicatedStorage.WaitForChild("RemoteEvents").GetChildren() as RemoteEvent[];
const remoteFunctions = ReplicatedStorage.WaitForChild("RemoteFunctions").GetChildren() as RemoteFunction[];

export function getPlayer(id?: number): Player | undefined {
    return id ? Players.GetPlayerByUserId(id!) : Players.LocalPlayer;
}

export function getDatastore(name: string): DataStore {
    return DataStoreService.GetDataStore(name);
}

export function onInput(inputType: Enum.UserInputType, callback: (input: InputObject) => void) {
    return UserInputService.InputBegan.Connect((input: InputObject) => {
        if (input.UserInputType === inputType) {
            callback(input);
        }
    });
}

export function getTween(object: Instance, info: TweenInfo, goal: { [key: string]: any }) {
    return TweenService.Create(object, info, goal);
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

export function getCharacterModel(name: string, position: Vector3) {
    const humanoidTemplate = ReplicatedStorage.WaitForChild(name) as Model;
    if (humanoidTemplate) {
        const humanoidClone = humanoidTemplate.Clone();
        const humanoidRootPart = humanoidClone.WaitForChild("HumanoidRootPart") as BasePart;
        humanoidRootPart.CFrame = new CFrame(position);
        humanoidClone.Parent = Workspace;
        return humanoidClone;
    }
    else {
        warn("PresetHumanoid model not found in ReplicatedStorage.");
    }
}

export function getDummyStats(): EntityStats {
    return {
        id: "adalbrecht",
        str: 1,
        dex: 1,
        acr: 1,
        spd: 1,
        siz: 1,
        int: 1,
        spr: 1,
        fai: 1,
        cha: 1,
        beu: 1,
        wil: 1,
        end: 1,
    }
}

export function getDummyCharacterModel(): Model {
    const humanoid = new Instance("Model");
    humanoid.Name = "Dummy";
    humanoid.Parent = game.Workspace;
    return humanoid;
}

export function saveTexture(id: string, texture: string) {
    const [success, fail] = pcall(() => {
        const ds = getDatastore("decalTexture");
        ds.SetAsync(id, texture);
    })
    if (!success) warn(fail);
}

export function getTexture(id: string): string {
    const ds = getDatastore("decalTexture");
    const [success, data] = pcall(() => ds.GetAsync(id));
    if (success) return data as string;
    else {
        warn(data);
        return "";
    }
}

export function getAbility(name: string): iAbility | undefined {
    const ds = getDatastore("abilities");
    const [success, data] = pcall(() => ds.GetAsync(name));
    if (success) return data as iAbility;
    else {
        warn(data);
        return undefined;
    }
}

export function saveAbility(...ability: iAbility[]) {
    const [success, fail] = pcall(() => {
        const ds = getDatastore("abilities");
        ability.forEach((a) => {
            ds.SetAsync(a.name, a);
        });
    })
    if (!success) warn(fail);
}

export function getCharacterStats(id: string): EntityStats | undefined {
    const ds = getDatastore("characterStats");
    const [success, data] = pcall(() => ds.GetAsync(id));
    if (success) return data as EntityStats;
    else {
        warn(data);
        return undefined;
    }
}

export function saveCharacterStats(character: EntityStats, overwrite = false) {
    const [success, fail] = pcall(() => {
        const ds = getDatastore("characterStats");
        if (overwrite) {
            warn(`Character [${character.id}] saved.`);
            ds.SetAsync(character.id, character);
        }
        else {
            const data = getCharacterStats(character.id);
            if (data) {
                warn(`Character [${character.id}] already exists.`);
                warn(data);
            } else {
                ds.SetAsync(character.id, character);
                warn(`Character [${character.id}] saved.`);
            }
        }
    })
    if (!success) warn(fail);
}

export function gridXYToWorldXY(position: Vector2, grid: Grid) {
    const size = grid.size;
    const r = size / 2;
    const YIncrement = size;
    const YShiftUnit = r;
    const XShiftUnit = 1.5 * r;
    const shiftingXY = position.X % 2 === 1;

    const y = (position.Y * YIncrement) + (shiftingXY ? YShiftUnit : 0);
    const x = (position.X * XShiftUnit);

    const localLocation = new Vector3(
        (y),
        0.125 * grid.size,
        (x),
    );
    const worldLocation = new Vector3(
        (y + grid.center.Y),
        0.125 * grid.size,
        (x + grid.center.X),
    );
    print(localLocation, "->", worldLocation);

    return worldLocation;
}

// Function to get the world position from the mouse position
export function getMouseWorldPosition(camera: Camera, mouse: Mouse): Vector3 | undefined {
    const mousePosition = new Vector2(mouse.X, mouse.Y);
    const ray = camera.ScreenPointToRay(mousePosition.X, mousePosition.Y);

    // Optional: Use Raycast to find the exact intersection with the world
    const raycastResult = Workspace.Raycast(ray.Origin, ray.Direction.mul(1000));
    if (raycastResult) {
        return raycastResult.Position; // Return the world position where the ray intersects an object
    }
}

export function extractMapValues<T extends defined>(map: Map<any, T>) {
    const va: T[] = [];
    for (const [k, v] of pairs(map)) {
        va.push(v);
    }
    return va;
}

export function requestData(requester: Player, datastoreName: string, key: string) {
    const requestDataRemoteEvent = remoteFunctions.find((re) => re.Name === "RequestData");
    if (requestDataRemoteEvent) {
        return requestDataRemoteEvent.InvokeServer(datastoreName, key);
    }
}

export function countObjectKeys(object: object) {
    let count = 0;
    for (const _ of pairs(object)) {
        count++;
    }
    return count;
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
