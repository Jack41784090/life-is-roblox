import { ReplicatedStorage } from "@rbxts/services";
import { getDummyCharacterModel } from "shared/func";
import { BotType, EntityInitRequirements, EntityStats, iEntity } from "shared/types/battle-types";
import Cell from "./Cell";

export default class Entity implements iEntity {
    cell: Cell | undefined;

    readonly stats: Readonly<EntityStats>;
    team: string;
    name: string;

    sta: number;
    hip: number;
    org: number;
    pos: number;

    botType: BotType = BotType.Enemy;

    instance?: Instance;

    constructor(options: EntityInitRequirements) {
        this.team = options.team;
        this.stats = { ...options.stats, id: options.stats.id };
        this.sta = options.sta ?? 0;
        this.hip = options.hip ?? 0;
        this.org = options.org ?? 0;
        this.pos = options.pos ?? 0;
        this.name = options.name ?? options.stats.id;
        this.botType = options.botType || BotType.Enemy;

        this.instance = getDummyCharacterModel()
        this.instance.Name = this.name;
    }

    setCell(cell: Cell) {
        this.cell = cell;
    }

    materialise() {
        if (this.cell === undefined) {
            throw "Coordinates not set";
        }

        const id = this.stats.id;
        const template = ReplicatedStorage.WaitForChild("entity_" + id) as BasePart | Model;
        const entity = template.Clone();

        if (entity.IsA("BasePart")) {
            entity.Position = this.cell.part.Position.add(new Vector3(0, this.cell.height * this.cell.size, 0));
        }
        else if (entity.IsA("Model")) {
            const primaryPart = entity.PrimaryPart;
            if (!primaryPart) {
                throw `PrimaryPart is not set for the model entity_${id}`;
            }
            const position = this.cell.part.Position.add(new Vector3(0, this.cell.height * this.cell.size, 0));
            entity.PivotTo(new CFrame(position));
        }
        else {
            throw `Unsupported entity type for entity_${id}`;
        }

        // Parent the entity to the cell part
        entity.Parent = this.cell.part;

        // Store the instance
        this.instance = entity;
    }

}
