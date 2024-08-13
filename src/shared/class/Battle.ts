// import { findDifference } from 'shared/func';
// import { BattleConfig, BattleField, BeforeAfter, BotType, FightingEntity, iBattleResult, iEntity, Location, ProfileInteractionType, ProfileType, UserData } from "../types";
// import Entity from "./Entity";

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
// export class Team {
//     name: string;
//     members: Entity[];
//     constructor(name: string, members: Entity[]) {
//         this.members = members;
//         this.name = name;
//     }
//     push(...members: Entity[]) {
//         for (const member of members) {
//             const exist = this.members.find(m => m.base.playerID === member.base.playerID);
//             if (!exist) {
//                 this.members.push(member);
//             }
//         }
//     }
// }

export class Battle {
    // Entity-Related Information
    teams: Team[] = [];
    totalEnemyCount: number = 0;
    enemyCount: number = 0;
    playerCount: number = 0;
    // battlefield: BattleField = new Map<Location, Entity[]>();

    // Timeslotting
    time: number = -1;

    private constructor() {
    }

    /**
     * Creates a new Battle instance with the given configuration.
     * @param c The BattleConfig object containing the configuration for the battle.
     * @returns A Promise that resolves to a Battle instance.
     */
    // static async Create(c: BattleConfig): Promise<Battle> {
    //     // 1. Get from Database the UserData of each player
    //     const party = await Promise.all(c.robloxPlayers.map(p => ))
    //         .then(c => c.filter(x => x !== null)) as UserData[];

    //     // 2. Create a new Battle instance and inject the players into the party argument
    //     const battle = new Battle(c, await Promise.all(party).then(c => c.filter(x => x !== null) as UserData[]));

    //     // 3. Get from Database the CombatCharacter of each player
    //     const fighters = await Promise.all(
    //         party.map(async p => {
    //             const characterAccess =
    //                 await ProfileManager.Register(ProfileType.CombatCharacter, p.combatCharacters[0], ProfileInteractionType.Default);
    //             if (characterAccess instanceof Error) return null;

    //             const characterBase = characterAccess.profile.data as FightingEntity;
    //             return characterBase ?
    //                 new Entity({
    //                     base: Object.assign({
    //                         name: characterBase.id,
    //                         ...characterBase
    //                     }, p),
    //                     team: c.teamMapping[p.id],
    //                     name: characterBase.id,
    //                     botType: BotType.Player,
    //                     isPlayer: true,
    //                     isPvp: true
    //                 }) :
    //                 null;
    //         })
    //     ).then(c => c.filter(x => x !== null) as Entity[]);
    //     // print(fighters)

    //     // 4. Populate userCache
    //     for (const user of c.robloxPlayers) {
    //         battle.userCache.set(user.id, user);
    //     }

    //     // 5. Assigning teams
    //     fighters.forEach(f => battle.teamAssign(c.teamMapping[f.base.id!], [f]));

    //     // 6. Queue the fighters to be spawned
    //     battle.spawnAtLocation('front', ...fighters.filter(f => f.botType === BotType.Player));

    //     return battle;
    // }

    //#region Team Management
    // teamAssign(name: string, members: Entity[] = []) {
    //     const exist = this.teams.find(t => t.name === name);
    //     if (exist) {
    //         exist.push(...members);
    //     }
    //     else {
    //         this.teams.push(new Team(name, members));
    //     }
    // }
    //#endregion

    //#region Round Management
    public begin() {
        print('【Begin】')
        if (this.time === -1) this.round();
    }

    private advanceTime() {
        this.time++;
        print(`【Time】 ${this.time}`)
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

    private async round() {
        this.advanceTime();
        wait(1);
        this.round();
    }
    //#endregion
}
