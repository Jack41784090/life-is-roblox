import { useCamera, useDebounceState, useEventListener } from "@rbxts/pretty-react-hooks";
import { useMemo } from "@rbxts/react";
import { config, SpringOptions } from "@rbxts/ripple";
import { DataStoreService, Players, ReplicatedStorage, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import remotes from "shared/remote";


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

export function getCharacterModel(name: string, position: Vector3 = new Vector3()) {
    const humanoidTemplate = ReplicatedStorage.WaitForChild('Models').FindFirstChild(name) as Model;
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
        id: "entity_adalbrecht",
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

export function hexQRSToWorldXY(qrs: Vector3, cellSize: number) {
    const q = qrs.X;
    const r = qrs.Y;

    const x = cellSize * (math.sqrt(3) * q + math.sqrt(3) / 2 * r);
    const y = cellSize * (3 / 2 * r);

    return new Vector3(x, 0, y);
}

export function hexGridQRSToWorldXY(qrs: Vector3, cellSize: number) {
    const q = qrs.X;
    const r = qrs.Y;

    const x = cellSize * (math.sqrt(3) * q + math.sqrt(3) / 2 * r);
    const y = cellSize * (3 / 2 * r);

    return new Vector3(x, 0, y);
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

export function extractMapValues<T extends defined>(map: Map<any, T> | Record<any, T>): T[] {
    const va: T[] = [];
    for (const [k, v] of pairs(map)) {
        va.push(v);
    }
    return va;
}
export function requestData(requester: Player, datastoreName: string, key: string) {
    if (RunService.IsClient()) {
        return remotes.requestData(datastoreName, key);
    }
    else {
        const datastore = getDatastore(datastoreName);
        const [success, data] = pcall(() => datastore.GetAsync(key));
        if (success) return data;
        else {
            warn(data); // error code
            return undefined;
        }
    }
}

export function countObjectKeys(object: object) {
    let count = 0;
    for (const _ of pairs(object)) {
        count++;
    }
    return count;
}

export function get2DManhattanDistance(a: Vector3, b: Vector3): number;
export function get2DManhattanDistance(a: Vector2, b: Vector2): number;
export function get2DManhattanDistance(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
    if (typeIs(a, "Vector3") && typeIs(b, "Vector3")) {
        return math.abs(a.X - b.X) + math.abs(a.Z - b.Z);
    } else if (typeIs(a, "Vector2") && typeIs(b, "Vector2")) {
        return math.abs(a.X - b.X) + math.abs(a.Y - b.Y);
    } else {
        throw "Invalid arguments: both arguments must be either Vector2 or Vector3";
    }
}
export function get2DEuclidDistance(a: Vector3, b: Vector3): number;
export function get2DEuclidDistance(a: Vector2, b: Vector2): number;
export function get2DEuclidDistance(a: Vector2 | Vector3, b: Vector2 | Vector3): number {
    if (typeIs(a, "Vector3") && typeIs(b, "Vector3")) {
        return math.sqrt(math.pow(a.X - b.X, 2) + math.pow(a.Z - b.Z, 2));
    } else if (typeIs(a, "Vector2") && typeIs(b, "Vector2")) {
        return math.sqrt(math.pow(a.X - b.X, 2) + math.pow(a.Y - b.Y, 2));
    } else {
        throw "Invalid arguments: both arguments must be either Vector2 or Vector3";
    }
}

export class PriorityQueue<T extends defined> {
    public heap: T[] = [];
    private priorityFunction: (element: T) => number;

    /**
     * Creates a new PriorityQueue with a given priority function.
     * @param priorityFunction - A function that takes an element and returns its priority as a number.
     */
    constructor(priorityFunction: (element: T) => number) {
        this.priorityFunction = priorityFunction;
    }

    /** Inserts an element into the priority queue. */
    public enqueue(element: T): void {
        this.heap.push(element);
        this.heapifyUp(this.heap.size() - 1);
    }

    /**
     * Removes and returns the element with the highest priority (lowest priority number).
     * Returns `undefined` if the queue is empty.
     */
    public dequeue(): T | undefined {
        if (this.heap.size() === 0) {
            return undefined;
        }
        const rootElement = this.heap[0];
        const lastElement = this.heap.pop();
        if (this.heap.size() > 0 && lastElement !== undefined) {
            this.heap[0] = lastElement;
            this.heapifyDown(0);
        }
        return rootElement;
    }

    /** Returns the element with the highest priority without removing it. */
    public peek(index: number = 0): T | undefined {
        return this.heap.size() > 0 ? this.heap[index] : undefined;
    }

    /** Returns the number of elements in the priority queue. */
    public size(): number {
        return this.heap.size();
    }

    /** Checks if the priority queue is empty. */
    public isEmpty(): boolean {
        return this.heap.size() === 0;
    }

    /** Swaps two elements in the heap by their indices. */
    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    /** Moves the element at the given index up to maintain the heap property. */
    private heapifyUp(index: number): void {
        let currentIndex = index;
        while (currentIndex > 0) {
            const parentIndex = math.floor((currentIndex - 1) / 2);
            if (
                this.priorityFunction(this.heap[currentIndex]) <
                this.priorityFunction(this.heap[parentIndex])
            ) {
                this.swap(currentIndex, parentIndex);
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    /** Moves the element at the given index down to maintain the heap property. */
    private heapifyDown(index: number): void {
        let currentIndex = index;
        const length = this.heap.size();
        let i = 0;
        while (true && i < this.heap.size() * 10) {
            let smallestIndex = currentIndex;
            const leftChildIndex = 2 * currentIndex + 1;
            const rightChildIndex = 2 * currentIndex + 2;

            let smallestPriority = this.priorityFunction(this.heap[smallestIndex]);

            if (leftChildIndex < length) {
                const leftChildPriority = this.priorityFunction(this.heap[leftChildIndex]);
                if (leftChildPriority < smallestPriority) {
                    smallestIndex = leftChildIndex;
                    smallestPriority = leftChildPriority;
                }
            }

            if (rightChildIndex < length) {
                const rightChildPriority = this.priorityFunction(this.heap[rightChildIndex]);
                if (rightChildPriority < smallestPriority) {
                    smallestIndex = rightChildIndex;
                    smallestPriority = rightChildPriority;
                }
            }

            if (smallestIndex !== currentIndex) {
                this.swap(currentIndex, smallestIndex);
                currentIndex = smallestIndex;
            } else {
                break;
            }
            i++;
        }

        if (i >= this.heap.size() * 10) {
            warn("HeapifyDown took too long to complete.", currentIndex, this.heap);
        }
    }

}

export function calculateRealityValue(reality: Reality, stats: EntityStats): number {
    switch (reality) {
        case Reality.HP:
            return (stats.end * 5) + (stats.siz * 2);
        case Reality.Force:
            return (stats.str * 2) + (stats.spd * 1) + (stats.siz * 1);
        case Reality.Mana:
            return (stats.int * 3) + (stats.spr * 2) + (stats.fai * 1);
        case Reality.Spirituality:
            return (stats.spr * 2) + (stats.fai * 2) + (stats.wil * 1);
        case Reality.Divinity:
            return (stats.fai * 3) + (stats.wil * 2) + (stats.cha * 1);
        case Reality.Precision:
            return (stats.dex * 2) + (stats.acr * 1) + (stats.spd * 1);
        case Reality.Maneuver:
            return (stats.acr * 2) + (stats.spd * 2) + (stats.dex * 1);
        case Reality.Convince:
            return (stats.cha * 2) + (stats.beu * 1) + (stats.int * 1);
        case Reality.Bravery:
            return (stats.wil * 2) + (stats.end * 1) + (stats.fai * 1);
        default:
            warn(`Reality value for ${reality} not found`);
            return 0;
    }
}

export function isAttackKills(attackerAction: AttackAction) {
    const { ability, executed } = attackerAction
    const { using, target } = ability
    if (!target) return false;

    if (!attackerAction.clashResult) return false;

    const { damage } = attackerAction.clashResult;

    if (executed) {
        return target.hip <= 0;
    }

    print(`IsAttackKills: ${target.hip} - ${damage} <= 0`);
    return target.hip - damage <= 0;
}

export function warnWrongSideCall(method: string, mes = "called on the wrong side") {
    warn(`${method}: ${mes}`);
}

interface ScaleFunction {
    /**
     * Scales `pixels` based on the current viewport size and rounds the result.
     */
    (pixels: number): number;
    /**
     * Scales `pixels` and rounds the result to the nearest even number.
     */
    even: (pixels: number) => number;
    /**
     * Scales a number based on the current viewport size without rounding.
     */
    scale: (percent: number) => number;
    /**
     * Scales `pixels` and rounds the result down.
     */
    floor: (pixels: number) => number;
    /**
     * Scales `pixels` and rounds the result up.
     */
    ceil: (pixels: number) => number;
}

const BASE_RESOLUTION = new Vector2(1280, 832);
const MIN_SCALE = 0.75;
const DOMINANT_AXIS = 0.5;

/**
 * @see https://discord.com/channels/476080952636997633/476080952636997635/1146857136358432900
 */
function calculateScale(viewport: Vector2) {
    const width = math.log(viewport.X / BASE_RESOLUTION.X, 2);
    const height = math.log(viewport.Y / BASE_RESOLUTION.Y, 2);
    const centered = width + (height - width) * DOMINANT_AXIS;

    return math.max(2 ** centered, MIN_SCALE);
}

export function usePx(): ScaleFunction {
    const camera = useCamera();

    const [scale, setScale] = useDebounceState(calculateScale(camera.ViewportSize), {
        wait: 0.2,
        leading: true,
    });

    useEventListener(camera.GetPropertyChangedSignal("ViewportSize"), () => {
        setScale(calculateScale(camera.ViewportSize));
    });

    return useMemo(() => {
        const api = {
            even: (value: number) => math.round(value * scale * 0.5) * 2,
            scale: (value: number) => value * scale,
            floor: (value: number) => math.floor(value * scale),
            ceil: (value: number) => math.ceil(value * scale),
        };

        setmetatable(api, {
            __call: (_, value) => math.round((value as number) * scale),
        });

        return api as ScaleFunction;
    }, [scale]);
}

/**
 * @param color The color to brighten or darken
 * @param brightness The amount to brighten or darken the color
 * @param vibrancy How much saturation changes with brightness
 */
export function brighten(color: Color3, brightness: number, vibrancy = 0.5) {
    const [h, s, v] = color.ToHSV();
    return Color3.fromHSV(h, math.clamp(s - brightness * vibrancy, 0, 1), math.clamp(v + brightness, 0, 1));
}

/**
 * @param color The color to saturate or desaturate
 * @param saturation How much to add or remove from the color's saturation
 */
export function saturate(color: Color3, saturation: number) {
    const [h, s, v] = color.ToHSV();
    return Color3.fromHSV(h, math.clamp(s + saturation, 0, 1), v);
}

/**
 * @returns How bright the color is
 */
export function getLuminance(color: Color3) {
    return color.R * 0.299 + color.G * 0.587 + color.B * 0.114;
}

/**
 * @returns Whether the color is bright, for determining foreground color
 */
export function isBright(color: Color3) {
    return getLuminance(color) > 0.65;
}

export const springs = {
    ...config.spring,
    bubbly: { tension: 300, friction: 20, mass: 1.2 },
    responsive: { tension: 600, friction: 34, mass: 0.7 },
} satisfies { [config: string]: SpringOptions };

export function getTestButtons() {
    return [
        {
            text: "Play",
            onClick: () => {
                // print("Play button clicked!");
            },
            backgroundColor: Color3.fromRGB(0, 255, 0),
        },
        {
            text: "Settings",
            onClick: () => {
                // print("Settings button clicked!");
            },
            backgroundColor: Color3.fromRGB(0, 0, 255),
        },
        {
            text: "Exit",
            onClick: () => {
                // print("Exit button clicked!");
            },
            backgroundColor: Color3.fromRGB(255, 0, 0),
        },
    ]
}

import { AtomMap } from "@rbxts/charm-sync";

type NestedAtomMap = {
    readonly [K in string]: AtomMap;
};

type FlattenNestedAtoms<T extends NestedAtomMap> = {
    readonly [K in keyof T as `${string & K}/${string & keyof T[K]}`]: T[K][Extract<keyof T[K], string>];
};

/**
 * Assigns unique prefixes to each atom and flattens them into a single map.
 * Should be passed to Charm's Sync API.
 *
 * @param maps The maps of atoms to flatten.
 * @returns The flattened map of atoms.
 */
export function flattenAtoms<T extends NestedAtomMap>(maps: T): FlattenNestedAtoms<T>;

export function flattenAtoms(maps: NestedAtomMap): FlattenNestedAtoms<NestedAtomMap> {
    const flattened = {} as Writable<FlattenNestedAtoms<NestedAtomMap>>;

    for (const [prefix, map] of pairs(maps)) {
        for (const [key, atom] of pairs(map)) {
            flattened[`${prefix}/${key}`] = atom;
        }
    }

    return flattened;
}

import { SyncPayload } from "@rbxts/charm-sync";
import { iAbility } from "shared/class/battle/State/Ability/types";
import { EntityStats } from "shared/class/battle/State/Entity/types";
import { GlobalAtoms } from "shared/datastore";
import { AttackAction, Reality } from "shared/types/battle-types";

/**
 * Filters the payload to only include the player's data.
 *
 * @param player The player to send the payload to.
 * @param payload The payload to filter.
 * @returns A new payload that only includes the player's data.
 */
export function filterPayload(player: Player, payload: SyncPayload<GlobalAtoms>) {
    if (payload.type === "init") {
        return {
            ...payload,
            data: {
                ...payload.data,
                "ds/players": {
                    [player.Name]: payload.data["ds/players"][player.Name],
                },
            },
        };
    }

    return {
        ...payload,
        data: {
            ...payload.data,
            "ds/players": payload.data["ds/players"] && {
                [player.Name]: payload.data["ds/players"][player.Name],
            },
        },
    };
}

const models = ReplicatedStorage.WaitForChild("Models") as Folder;
export function getModelTemplateByID(id: string) {
    return models.FindFirstChild(id) as Model | undefined;
}

export function getDummyNumbers(qr: Vector2) {
    return {
        stats: getDummyStats(),
        playerID: -4178,
        hip: 0,
        pos: 0,
        org: 999,
        mana: 999,
        sta: 999,
        qr,
    }
}


export function getDirectionFromEnumKeyCode(keycode: Enum.KeyCode, relativeCam: Camera) {
    const cameraPointTowards = relativeCam.CFrame.LookVector;
    switch (keycode) {
        case Enum.KeyCode.W:
        case Enum.KeyCode.Up:
            return cameraPointTowards.Unit;
        case Enum.KeyCode.S:
        case Enum.KeyCode.Down:
            return cameraPointTowards.Unit.mul(-1);
        case Enum.KeyCode.A:
        case Enum.KeyCode.Left:
            return cameraPointTowards.Unit.mul(-1).Cross(new Vector3(0, 1, 0));
        case Enum.KeyCode.D:
        case Enum.KeyCode.Right:
            return cameraPointTowards.Unit.Cross(new Vector3(0, 1, 0));
        default:
            return new Vector3();
    }
}

export function math_map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

export function getPartsInArea(part: BasePart): BasePart[] {
    const overlapParams = new OverlapParams();
    overlapParams.FilterType = Enum.RaycastFilterType.Exclude;
    overlapParams.FilterDescendantsInstances = [part];

    // Get parts in the area of this part
    const partsInArea = Workspace.GetPartBoundsInBox(
        part.CFrame,
        part.Size,
        overlapParams
    );

    return partsInArea;
}

export function newTouched(sensitivePart: BasePart, callBack: (hit: BasePart) => void) {
    return RunService.RenderStepped.Connect((deltaTime) => {
        const partsInArea = getPartsInArea(sensitivePart);
        for (const part of partsInArea) {
            if (part.Parent && part.Parent.IsA("Model")) {
                callBack(part);
            }
        }
    });
}

/**
 * Visualizes a position in the world with a temporary part for debugging purposes
 * @param position The world position to visualize
 * @param color Optional color for the marker (default is red)
 * @param duration How long the marker should remain visible (default 5 seconds)
 */
export function visualizePosition(position: Vector3, color: Color3 = new Color3(1, 0, 0), duration: number = 5) {
    const marker = new Instance("Part");
    marker.Anchored = true;
    marker.CanCollide = false;
    marker.Size = new Vector3(0.5, 0.5, 0.5);
    marker.Position = position;
    marker.Material = Enum.Material.Neon;
    marker.BrickColor = new BrickColor(color);
    marker.Transparency = 0.5;
    marker.Shape = Enum.PartType.Ball;
    marker.Parent = Workspace;

    // Add a billboardgui with position info
    const billboardGui = new Instance("BillboardGui");
    billboardGui.Size = new UDim2(0, 200, 0, 50);
    billboardGui.StudsOffset = new Vector3(0, 1, 0);
    billboardGui.AlwaysOnTop = true;
    billboardGui.Parent = marker;

    const textLabel = new Instance("TextLabel");
    textLabel.Size = UDim2.fromScale(1, 1);
    textLabel.BackgroundTransparency = 1;
    textLabel.TextColor3 = new Color3(1, 1, 1);
    textLabel.Text = `X: ${math.floor(position.X)} Y: ${math.floor(position.Y)} Z: ${math.floor(position.Z)}`;
    textLabel.TextSize = 14;
    textLabel.Font = Enum.Font.GothamMedium;
    textLabel.Parent = billboardGui;

    // Remove after duration
    task.delay(duration, () => {
        marker.Destroy();
    });

    return marker;
}
