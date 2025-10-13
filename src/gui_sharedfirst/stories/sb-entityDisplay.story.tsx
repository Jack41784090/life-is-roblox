import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import EntityDisplay from "gui_sharedfirst/squad-battle/entity/EntityDisplay"
import { Reality } from "shared/class/battle/Systems/CombatSystem/types"
import { getDummyStats } from "shared/utils"
import { SquadEntity } from "squad-battle/Entity"
import { SquadEntityInSquadLocation } from "squad-battle/type"

const controls = {
    statusCount: 5,
}
const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
    controls,
}, ({ controls }) => {
    const entity = new SquadEntity({
        playerID: 1, stats: getDummyStats(), team: 'team1', name: 'tc1_1_1', logicType: 'Adjust_Weapon_Test',
        startingLocation: SquadEntityInSquadLocation.front,
        weapon: {
            hitBonus: 0,
            penetrationBonus: 0,
            damageTranslation: {},
            weaponRange: {
                [SquadEntityInSquadLocation.front]: [SquadEntityInSquadLocation.front],
                [SquadEntityInSquadLocation.middle]: [SquadEntityInSquadLocation.front, SquadEntityInSquadLocation.middle],
                [SquadEntityInSquadLocation.back]: [],
            }
        }
    })

    // props.
    for (let i = 0; i < controls.statusCount; i++) {
        entity.statusEffects.push(
            {
                affected: 'target',
                trigger: 'OnAbilityCasted',
                effect: {
                    type: 'Damage',
                    damageType: 'Physical',
                    amount: 0,
                    calculation: {
                        type: 'StatScaling',
                        stat: Reality.HP,
                        percent: 0
                    }
                },
                duration: 0,
            },)
    }

    return <frame
        Position={UDim2.fromScale(.5, .5)}
        Size={UDim2.fromScale(.5, .5)}
        AnchorPoint={new Vector2(.5, .5)}
        BackgroundTransparency={1}
    >
        <EntityDisplay
            getTimer={() => 0}
            key={1}
            entity={entity}
            entityUpdates={[]}
            // upsideDown={props.upsideDown}
            transferFunction={(x) => x}
            enableDebugWarns={true}
        />
    </frame>
})

export = story