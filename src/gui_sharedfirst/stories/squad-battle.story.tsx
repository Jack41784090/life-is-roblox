import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import BattleField from "gui_sharedfirst/squad-battle/BattleField"
import { getDummyStats } from "shared/utils"
import { Squad } from "squad-battle/Squad"

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    const team1Squads: Squad[] = [{
        entities: [{
            playerID: 1,
            team: "Team1",
            name: "Onechoice",
            stats: getDummyStats(),
        }],
        name: "Team1 - Squad1",
    }, {
        entities: [{
            playerID: 1,
            team: "Team1",
            name: "Onechoice",
            stats: getDummyStats(),
        }],
        name: "Team1 - Squad1",
    }, {
        entities: [{
            playerID: 1,
            team: "Team1",
            name: "Onechoice",
            stats: getDummyStats(),
        }],
        name: "Team1 - Squad1",
    }].map(C => new Squad(C))

    const team2Squads: Squad[] = [{
        entities: [{
            playerID: 2,
            team: "Team2",
            name: "Twomad",
            stats: getDummyStats(),
        }],
        name: "Team2 - Squad1",
    }, {
        entities: [{
            playerID: 2,
            team: "Team2",
            name: "Twomad",
            stats: getDummyStats(),
        }],
        name: "Team2 - Squad1",
    }, {
        entities: [{
            playerID: 2,
            team: "Team2",
            name: "Twomad",
            stats: getDummyStats(),
        }],
        name: "Team2 - Squad1",
    },
    {
        entities: [{
            playerID: 2,
            team: "Team2",
            name: "Twomad",
            stats: getDummyStats(),
        }],
        name: "Team2 - Squad1",
    }].map(C => new Squad(C))

    return <>
        <BattleField
            squads={{
                'Team1': team1Squads,
                'Team2': team2Squads,
                // 'Team3': [],
            }}
            us="Team1"
            currentRound={10}
        />
    </>
})

export = story