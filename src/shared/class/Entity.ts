import { ReplicatedStorage } from "@rbxts/services";
import { ActionType, BotType, EntityInitRequirements, EntityStats, iEntity, ReadinessIcon } from "shared/types/battle-types";
import Cell from "./Cell";

export default class Entity implements iEntity {
    playerID: number;
    iconURL?: ReadinessIcon;
    cell: Cell | undefined;

    readonly stats: Readonly<EntityStats>;
    team?: string;
    name: string;

    sta: number;
    hip: number;
    org: number;
    pos: number;

    botType: BotType = BotType.Enemy;

    model?: Model;

    constructor(options: EntityInitRequirements) {
        this.playerID = options.playerID;
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = options.sta ?? 0;
        this.hip = options.hip ?? 0;
        this.org = options.org ?? 0;
        this.pos = options.pos ?? 0;
        this.name = options.name ?? options.stats.id;
        this.botType = options.botType || BotType.Enemy;
    }


    setCell(cell: Cell) {
        this.cell = cell;
    }

    materialise() {
        if (!this.cell) {
            warn("Coordinates not set");
            return;
        }

        const id = this.stats.id;
        const template = ReplicatedStorage.WaitForChild(`entity_${id}`) as Model;
        const entity = template.Clone();

        if (entity.IsA("BasePart")) {
            this.positionBasePart(entity);
        } else if (entity.IsA("Model")) {
            this.positionModel(entity);
        } else {
            throw `Unsupported entity type for entity_${id}`;
        }

        entity.Parent = this.cell.part;
        this.model = entity;
    }

    private positionBasePart(entity: BasePart) {
        entity.Position = this.cell!.part.Position.add(new Vector3(0, this.cell!.height * this.cell!.size, 0));
    }

    private positionModel(entity: Model) {
        const primaryPart = entity.PrimaryPart;
        if (!primaryPart) {
            throw `PrimaryPart is not set for the model entity_${this.stats.id}`;
        }
        const position = this.cell!.part.Position.add(new Vector3(0, this.cell!.height * this.cell!.size, 0));
        entity.PivotTo(new CFrame(position));
    }

    getActions(): { type: ActionType, action: () => void }[] {
        return [
            { type: ActionType.Attack, action: () => print("Attack") },
            { type: ActionType.Defend, action: () => print("Defend") },
            { type: ActionType.Move, action: () => print("Move") },
            { type: ActionType.Wait, action: () => print("Wait") },
        ]
    }
}
