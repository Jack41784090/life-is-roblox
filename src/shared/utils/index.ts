import { config, SpringOptions } from "@rbxts/ripple";
import { DataStoreService, Players, ReplicatedStorage, RunService, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { modelFolder } from "shared/const/assets";
import remotes from "shared/remote";
import logger from "./Logger";

//===========================================================================
// PLAYER AND DATASTORE UTILITIES
//===========================================================================

export function getPlayer(id?: number): Player | undefined {
    return id ? Players.GetPlayerByUserId(id!) : Players.LocalPlayer;
}

export function getDatastore(name: string): DataStore {
    return DataStoreService.GetDataStore(name);
}

//===========================================================================
// INPUT UTILITIES
//===========================================================================

export function onInput(inputType: Enum.UserInputType, callback: (input: InputObject) => void) {
    return UserInputService.InputBegan.Connect((input: InputObject) => {
        if (input.UserInputType === inputType) {
            callback(input);
        }
    });
}

//===========================================================================
// TWEEN UTILITIES
//===========================================================================

export function getTween(object: Instance, info: TweenInfo, goal: { [key: string]: any }) {
    return TweenService.Create(object, info, goal);
}

//===========================================================================
// CHARACTER UTILITIES
//===========================================================================

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

//===========================================================================
// MODEL AND ASSET UTILITIES
//===========================================================================

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
        logger.warn("PresetHumanoid model not found in ReplicatedStorage.", "ModelUtils");
    }
}

/**
 * Retrieves a model template from ReplicatedStorage by its identifier
 * @param id The unique identifier of the model to retrieve
 * @returns The model if found, otherwise undefined
 */
export function getModelTemplateByID(id: string) {
    return modelFolder.FindFirstChild(id) as Model | undefined;
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

export function createDummyEntityStats(qr: Vector2) {
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

//===========================================================================
// DATASTORE UTILITIES
//===========================================================================

export function saveTexture(id: string, texture: string) {
    const [success, fail] = pcall(() => {
        const ds = getDatastore("decalTexture");
        ds.SetAsync(id, texture);
    })
    if (!success) logger.error(fail as defined, "DataStoreUtils");
}

export function getTexture(id: string): string {
    const ds = getDatastore("decalTexture");
    const [success, data] = pcall(() => ds.GetAsync(id));
    if (success) return data as string;
    else {
        logger.error(data as defined, "DataStoreUtils");
        return "";
    }
}

export function getAbility(name: string): iAbility | undefined {
    const ds = getDatastore("abilities");
    const [success, data] = pcall(() => ds.GetAsync(name));
    if (success) return data as iAbility;
    else {
        logger.error(data as defined, "DataStoreUtils");
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
    if (!success) logger.error(fail as defined, "DataStoreUtils");
}

export function getCharacterStats(id: string): EntityStats | undefined {
    const ds = getDatastore("characterStats");
    const [success, data] = pcall(() => ds.GetAsync(id));
    if (success) return data as EntityStats;
    else {
        logger.error(data as defined, "DataStoreUtils");
        return undefined;
    }
}

export function saveCharacterStats(character: EntityStats, overwrite = false) {
    const [success, fail] = pcall(() => {
        const ds = getDatastore("characterStats");
        if (overwrite) {
            logger.info(`Character [${character.id}] saved.`, "DataStoreUtils");
            ds.SetAsync(character.id, character);
        }
        else {
            const data = getCharacterStats(character.id);
            if (data) {
                logger.warn(`Character [${character.id}] already exists.`, "DataStoreUtils");
                logger.debug(data, "DataStoreUtils");
            } else {
                ds.SetAsync(character.id, character);
                logger.info(`Character [${character.id}] saved.`, "DataStoreUtils");
            }
        }
    })
    if (!success) logger.error(fail as defined, "DataStoreUtils");
}

//===========================================================================
// HEX GRID UTILITIES
//===========================================================================

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

//===========================================================================
// CAMERA AND INPUT UTILITIES
//===========================================================================

export function getMouseWorldPosition(camera: Camera, mouse: Mouse): Vector3 | undefined {
    const mousePosition = new Vector2(mouse.X, mouse.Y);
    const ray = camera.ScreenPointToRay(mousePosition.X, mousePosition.Y);

    const raycastResult = Workspace.Raycast(ray.Origin, ray.Direction.mul(1000));
    if (raycastResult) {
        return raycastResult.Position;
    }
}

export function getDirectionFromKeyCode(keycode: Enum.KeyCode, relativeCam: Camera) {
    const cameraDirection = relativeCam.CFrame.LookVector.Unit;
    const upVector = new Vector3(0, 1, 0);

    switch (keycode) {
        case Enum.KeyCode.W:
        case Enum.KeyCode.Up:
            return cameraDirection;
        case Enum.KeyCode.S:
        case Enum.KeyCode.Down:
            return cameraDirection.mul(-1);
        case Enum.KeyCode.A:
        case Enum.KeyCode.Left:
            return cameraDirection.mul(-1).Cross(upVector);
        case Enum.KeyCode.D:
        case Enum.KeyCode.Right:
            return cameraDirection.Cross(upVector);
        default:
            return new Vector3();
    }
}

//===========================================================================
// MATH UTILITIES
//===========================================================================

export function formatVector3(vector: Vector3): string {
    return `(${math.floor(vector.X * 100) / 100}, ${math.floor(vector.Y * 100) / 100}, ${math.floor(vector.Z * 100) / 100})`;
}


export function extractMapValues<T extends defined>(map: Map<any, T> | Record<any, T>, filter?: (i: T) => boolean): T[] {
    const va: T[] = [];
    for (const [k, v] of pairs(map)) {
        if (!filter || filter(v)) va.push(v);
    }
    return va;
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

export function copyVector3(vector: Vector3) {
    return new Vector3(vector.X, vector.Y, vector.Z);
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

//===========================================================================
// PHYSICS AND COLLISION UTILITIES
//===========================================================================

export function getPartsInArea(part: BasePart): BasePart[] {
    const overlapParams = new OverlapParams();
    overlapParams.FilterType = Enum.RaycastFilterType.Exclude;
    overlapParams.FilterDescendantsInstances = [part];

    return Workspace.GetPartBoundsInBox(
        part.CFrame,
        part.Size,
        overlapParams
    );
}

export function createTouchDetector(sensitivePart: BasePart, callback: (hit: BasePart) => void) {
    return RunService.RenderStepped.Connect(() => {
        for (const part of getPartsInArea(sensitivePart)) {
            if (part.Parent && part.Parent.IsA("Model")) {
                callback(part);
            }
        }
    });
}

//===========================================================================
// DEBUG UTILITIES
//===========================================================================

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

    task.delay(duration, () => {
        marker.Destroy();
    });

    return marker;
}

//===========================================================================
// PRIORITY QUEUE CLASS
//===========================================================================

export class PriorityQueue<T extends defined> {
    public heap: T[] = [];
    private priorityFunction: (element: T) => number;

    constructor(priorityFunction: (element: T) => number) {
        this.priorityFunction = priorityFunction;
    }

    public enqueue(element: T): void {
        this.heap.push(element);
        this.heapifyUp(this.heap.size() - 1);
    }

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

    public peek(index: number = 0): T | undefined {
        return this.heap.size() > 0 ? this.heap[index] : undefined;
    }

    public size(): number {
        return this.heap.size();
    }

    public isEmpty(): boolean {
        return this.heap.size() === 0;
    }

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

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
            logger.warn("HeapifyDown took too long to complete.", "PriorityQueue");
        }
    }
}

//===========================================================================
// REALITY CALCULATIONS
//===========================================================================

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
            logger.warn(`Reality value for ${reality} not found`, "RealityCalculations");
            return 0;
    }
}

//===========================================================================
// ATTACK UTILITIES
//===========================================================================

export function isAttackKills(attackerAction: AttackAction) {
    const { ability, executed } = attackerAction
    const { using, target } = ability
    if (!target) return false;

    if (!attackerAction.clashResult) return false;

    const { damage } = attackerAction.clashResult;

    if (executed) {
        return target.hip <= 0;
    }

    logger.debug(`IsAttackKills: ${target.hip} - ${damage} <= 0`, "AttackUtils");
    return target.hip - damage <= 0;
}

//===========================================================================
// MISCELLANEOUS UTILITIES
//===========================================================================

export function warnWrongSideCall(method: string, mes = "called on the wrong side") {
    logger.warn(`${method}: ${mes}`, "MiscUtils");
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
            logger.error(data as defined, "MiscUtils"); // error code
            return undefined;
        }
    }
}

//===========================================================================
// COLOR UTILITIES
//===========================================================================

export function brighten(color: Color3, brightness: number, vibrancy = 0.5) {
    const [h, s, v] = color.ToHSV();
    return Color3.fromHSV(h, math.clamp(s - brightness * vibrancy, 0, 1), math.clamp(v + brightness, 0, 1));
}

export function saturate(color: Color3, saturation: number) {
    const [h, s, v] = color.ToHSV();
    return Color3.fromHSV(h, math.clamp(s + saturation, 0, 1), v);
}

export function getLuminance(color: Color3) {
    return color.R * 0.299 + color.G * 0.587 + color.B * 0.114;
}

export function isBright(color: Color3) {
    return getLuminance(color) > 0.65;
}

//===========================================================================
// SPRING CONFIGURATIONS
//===========================================================================

export const springs = {
    ...config.spring,
    bubbly: { tension: 300, friction: 20, mass: 1.2 },
    responsive: { tension: 600, friction: 34, mass: 0.7 },
} satisfies { [config: string]: SpringOptions };

//===========================================================================
// TEST BUTTONS
//===========================================================================

export function getTestButtons() {
    return [
        {
            text: "Play",
            onClick: () => {
                // logger.debug("Play button clicked!", "TestButtons");
            },
            backgroundColor: Color3.fromRGB(0, 255, 0),
        },
        {
            text: "Settings",
            onClick: () => {
                // logger.debug("Settings button clicked!", "TestButtons");
            },
            backgroundColor: Color3.fromRGB(0, 0, 255),
        },
        {
            text: "Exit",
            onClick: () => {
                // logger.debug("Exit button clicked!", "TestButtons");
            },
            backgroundColor: Color3.fromRGB(255, 0, 0),
        },
    ]
}

//===========================================================================
// ATOM UTILITIES
//===========================================================================

import { AtomMap } from "@rbxts/charm-sync";

type NestedAtomMap = {
    readonly [K in string]: AtomMap;
};

type FlattenNestedAtoms<T extends NestedAtomMap> = {
    readonly [K in keyof T as `${string & K}/${string & keyof T[K]}`]: T[K][Extract<keyof T[K], string>];
};

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

//===========================================================================
// PAYLOAD FILTERING
//===========================================================================

import { SyncPayload } from "@rbxts/charm-sync";
import { iAbility } from "shared/class/battle/State/Ability/types";
import { EntityStats } from "shared/class/battle/State/Entity/types";
import { GlobalAtoms } from "shared/datastore";
import { AttackAction, Reality } from "shared/types/battle-types";

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
