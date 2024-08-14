import { getDummyStats } from "shared/func";
import { BattleConfig, BotType } from "shared/types/battle-types";
import Entity from "./Entity";
import Grid from "./Grid";

// /**
//  * Represents the result of a battle.
//  * @implements iBattleResult
//  * @class
//  * @classdesc Represents the result of a battle.
//  * @param {Partial<iBattleResult>} d - The partial battle result data along with the required entities.
//  * @returns {BattleResult} A new instance of the BattleResult class.
//  * @example
//  * const result = new BattleResult({
//  *      desc: 'None',
//  *      attackerDiff: [findDifference(attacker, vattacker)],
//  *      targetDiff: [findDifference(target, vTarget)],
//  *      vattacker: attacker.applyCurrentStatus(),
//  *      vTarget: target.applyCurrentStatus(),
//  *      attacker: attacker,
//  *      target: target,
//  * });
//  */
// class BattleResult implements iBattleResult {
//     desc: string;
//     attackerDiff: BeforeAfter;
//     targetDiff: BeforeAfter;
//     vattacker: iEntity;
//     vTarget: iEntity;
//     attacker: Entity;
//     target: Entity;

//     /**
//      * Constructs a new instance of the BattleResult class.
//      * @param d - The partial battle result data along with the required entities.
//      */
//     constructor(d: Partial<iBattleResult> & { vattacker: iEntity, vTarget: iEntity, target: Entity, attacker: Entity }) {
//         this.desc = d.desc ?? 'None';
//         this.attackerDiff = d.attackerDiff ?? [findDifference(d.attacker, d.vattacker)];
//         this.targetDiff = d.targetDiff ?? [findDifference(d.target, d.vTarget)];
//         this.vattacker = d.vattacker;
//         this.vTarget = d.vTarget;
//         this.attacker = d.attacker;
//         this.target = d.target;
//     }
// }

export class BattleTeam {
    name: string;
    members: Entity[];
    constructor(name: string, members: Entity[]) {
        this.members = members;
        this.name = name;
    }
    push(...members: Entity[]) {
        for (const member of members) {
            const exist = this.members.find(m => m.stats.id === member.stats.id);
            if (!exist) {
                this.members.push(member);
            }
        }
    }
}

export class Battle {
    camera: Camera;
    grid: Grid;

    // Entity-Related Information
    teams: BattleTeam[] = [];
    totalEnemyCount: number = 0;
    enemyCount: number = 0;
    playerCount: number = 0;

    // Timeslotting
    time: number = -1;

    constructor(config: BattleConfig) {
        const { width, height, camera, center, size } = config;

        // Set up the camera
        this.camera = camera;
        const camera_x = math.floor(center.X) * size;
        const camera_y = math.floor(center.Y) * size;
        this.setCameraCFrame(
            new Vector3(camera_x, size * 5, camera_y),
            new Vector3(camera_x, 0, camera_y));

        // Set up the grid
        this.grid = new Grid(new Vector2(width, height), center, size);
        this.grid.materialise()

        // Set up the teams
        for (const [teamName, playerList] of pairs(config.teamMap)) {
            const members = playerList.map(player => {
                const entity = new Entity({
                    stats: getDummyStats(),
                    pos: 0,
                    org: 0,
                    hip: 0,
                    name: player.Name,
                    team: teamName,
                    botType: player.UserId === 0 ? BotType.Enemy : undefined,
                });
                return entity;
            });
            this.teams.push(new BattleTeam(teamName, members));
        }
    }

    private setCameraCFrame(pos: Vector3, lookAt: Vector3, camera?: Camera) {
        (camera ?? this.camera).CameraType = Enum.CameraType.Scriptable;
        (camera ?? this.camera).CFrame = new CFrame(pos, lookAt);
    }

    spawn() {
        for (const team of this.teams) {
            for (const entity of team.members) {
                entity.setCell(entity.cell ??
                    this.grid.cellsXY.get(math.random(0, this.grid.widthheight.X - 1), math.random(0, this.grid.widthheight.Y - 1))!
                );
                print(`Spawning ${entity.name} at ${entity.cell?.xy.X}, ${entity.cell?.xy.Y}`)

                entity.materialise();
            }
        }
    }

    public begin() {
        print('【Begin】')
        if (this.time === -1) this.round();
    }

    private advanceTime() {
        this.time++;
        print(`【Time】 ${this.time}`)
    }

    private async round() {
        this.advanceTime();
        wait(1);
        this.round();
    }

    // private dealWithClash(attacker: Entity, target: Entity): BattleResult {
    //     print(`【Clash】 ${attacker.name} clashes with ${target.name}`)

    //     // SET UP CONSTANTS
    //     const ability = attacker.getAction();
    //     const targetAbility = target.getAction();
    //     if (!ability) return new BattleResult({ desc: 'No ability found', attacker: attacker, target, vattacker: attacker.virtual(), vTarget: target.virtual() });

    //     const atk_an = "Attack Ability"
    //     const tgt_an = "Target Ability"

    //     const {
    //         attackerDiff,
    //         targetDiff,
    //         vattacker,
    //         vTarget,
    //         value,
    //     } = attack(attacker, target, (dr: { forceDamage: number; pierceDamage: number; }) => {
    //         const postureDamage = (dr.forceDamage * 0.65 + dr.pierceDamage * 0.35) * uniformRandom(0.95, 1.05);
    //         return postureDamage;
    //     }, 'pos', true);

    //     print(`Clash-Before-NOPOS:`)
    //     print(target, attacker)
    //     print(`Clash-After-NOPOS:`)
    //     print(vTarget, vattacker)
    //     print(`【Damage】${attacker.name} hits ${target.name} with ${atk_an}!`,
    //         `${target.pos} - ${value} = ${vTarget.pos}`)

    //     const desc = `${attacker.name + (attacker.base.username ? `/${attacker.base.username}` : '')} [${atk_an}]` +
    //         " clashes with " +
    //         `${target.name + (target.base.username ? `/${target.base.username}` : '')} [${tgt_an}]!`;
    //     return new BattleResult({
    //         desc,
    //         attackerDiff,
    //         targetDiff,
    //         vattacker,
    //         vTarget,
    //         attacker,
    //         target,
    //     })
    // }
}
