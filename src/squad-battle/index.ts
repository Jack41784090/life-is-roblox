import { SquadBattle } from "./Battle";
import { SquadBattleGraphics } from "./Graphics";
import { SquadBattleConfig } from "./type";

export class SquadBattleInstance {
    battle: SquadBattle;
    graphics: SquadBattleGraphics;

    constructor(sbconfig: SquadBattleConfig) {
        this.battle = new SquadBattle(sbconfig);
        this.graphics = new SquadBattleGraphics(this.battle);
    }

    autoBattle() {
        while (this.battle.checkVictory() === false && this.battle.roundCount < 100) {
            print(`--- Round ${this.battle.roundCount + 1} ---`);
            const update = this.battle.round();
            this.graphics.render();
            wait(0.5)
            print('')
        }
    }
}