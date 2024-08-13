// import { BotType, EntityConstance, EntityInitRequirements, iEntity, Location } from "shared/types";

// export default class Entity implements iEntity {
//     readonly base: Readonly<EntityConstance>;
//     team: string;
//     name: string = '[?]';

//     warSupport: number;
//     stamina: number;
//     hp: number;
//     org: number;
//     pos: number;

//     loc: Location = 'front';
//     botType: BotType = BotType.Enemy;
//     isPlayer: boolean = false;
//     isPvp: boolean = false;

//     constructor(options: EntityInitRequirements) {
//         this.base = options.base;
//         this.team = options.team;
//         this.name = options.name ?? this.name;
//         this.loc = options.loc ?? this.loc;
//         this.botType = options.botType ?? this.botType;

//         this.warSupport = options.warSupport ?? maxHP(this.base);
//         this.stamina = options.stamina ?? maxStamina(this.base);
//         this.hp = options.hp ?? maxHP(this.base);
//         this.org = options.org ?? maxOrganisation(this.base);
//         this.pos = options.pos ?? maxPosture(this.base);
//     }

//     getFullName() {
//         return `${this.name} <@${this.base.id}>`
//     }
// }
