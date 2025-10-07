import React from "@rbxts/react";
import GuiMothership from "gui_sharedfirst/new_components/main";
import BattleField from 'gui_sharedfirst/squad-battle/BattleField';
import { SquadBattle } from "squad-battle/Battle";
import { EntityUpdate } from "squad-battle/type";

export class SquadBattleGraphics {
    squadBattle: SquadBattle;
    // guimothership = GuiMothership.Get();

    constructor(squadBattle: SquadBattle) {
        this.squadBattle = squadBattle;
    }

    render(entityUpdates: EntityUpdate[], delayBetweenIndicatorsInSeconds = .1) {
        GuiMothership.Mount('SquadBattle',
            <BattleField
                playerTeamName={'team1'}
                squads={this.squadBattle.teamsAndSquads}
                entityUpdates={entityUpdates}
                delayBetweenIndicatorsInSeconds={delayBetweenIndicatorsInSeconds}
                enableDebugWarns={true}
            />
        );
    }
}