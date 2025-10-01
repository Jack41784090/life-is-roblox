import { SquadBattle } from "./Battle";
import { SquadEntity } from "./Entity";
import { SquadBattleGraphics } from "./Graphics";
import { SquadBattleConfig } from "./type";

export class SquadBattleInstance {
    battle: SquadBattle;
    graphics: SquadBattleGraphics;

    constructor(sbconfig: SquadBattleConfig) {
        this.battle = new SquadBattle(sbconfig);
        this.graphics = new SquadBattleGraphics(this.battle);
    }

    _lastRoundCapitulatedEntities = new Set<SquadEntity>();
    autoBattle() {
        this.graphics.render([]);
        wait(1)
        while (this.battle.checkVictory() === false && this.battle.roundCount < 100) {
            print(`--- Round ${this.battle.roundCount + 1} ---`);
            const battle = this.battle;
            battle.roundCount++;

            battle.removeDeadEntities();
            battle.removeCapitulatedEntities(this._lastRoundCapitulatedEntities);
            this._lastRoundCapitulatedEntities.clear();

            const updates = battle.squadActions();
            // this.graphics.render(updates);

            const recovery_update = battle.squadRecoveries();
            // this.graphics.render(recovery_update);
            this.graphics.render(updates);

            updates.forEach(u => {
                if (u.change.property === 'LEAVE') {
                    this._lastRoundCapitulatedEntities.add(battle.getEntityByID(u.affected));
                }
            })

            wait(2)
            print('')
        }
    }
}