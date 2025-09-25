import React from "@rbxts/react";
import GuiMothership from "gui_sharedfirst/new_components/main";
import BattleField from 'gui_sharedfirst/squad-battle/BattleField';
import { SquadBattle } from "squad-battle/Battle";

class SquadBattleGraphics {
    squadBattle: SquadBattle;
    // guimothership = GuiMothership.Get();

    constructor(squadBattle: SquadBattle) {
        this.squadBattle = squadBattle;
    }

    render() {
        GuiMothership.Mount('SquadBattle',
            <BattleField
                squads={this.squadBattle.teamsAndSquads}
            />
        );
    }
}