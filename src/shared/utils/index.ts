import { DataStoreService, Players, ReplicatedStorage, TweenService, UserInputService, Workspace } from "@rbxts/services";
import Grid from "shared/class/Grid";
import { EntityStats, iAbility } from "shared/types/battle-types";
import { remoteFunctionsMap } from "./events";


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
        (y + grid.center.Y - grid.width * grid.size / 2),
        0.125 * grid.size,
        (x + grid.center.X - grid.height * grid.size / 2),
    );

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
    const requestDataRemoteEvent = remoteFunctionsMap["RequestData"];
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

export function get2DEuclidDistance(a: Vector3, b: Vector3) {
    return math.sqrt(math.pow(a.X - b.X, 2) + math.pow(a.Z - b.Z, 2));
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
