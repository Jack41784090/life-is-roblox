import { SquadBattle } from "./Battle";
import { SquadBattleGraphics } from "./Graphics";
import { SquadBattleConfig } from "./type";

export class SquadBattleInstance {
    squadBattle: SquadBattle;
    squadBattleGraphics: SquadBattleGraphics;

    constructor(sbconfig: SquadBattleConfig) {
        this.squadBattle = new SquadBattle(sbconfig);
        this.squadBattleGraphics = new SquadBattleGraphics(this.squadBattle);
    }


    autoBattle() {
        while (this.squadBattle.checkVictory() === false && this.squadBattle.roundCount < 100) {
            print(`--- Round ${this.squadBattle.roundCount + 1} ---`);
            this.squadBattle.round();
            this.squadBattleGraphics.render();
            wait(0.5)
            print('')
        }
    }
}