import { atom } from "@rbxts/charm"
import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import PlayerPortrait from "gui_sharedfirst/new_components/battle/statusBar/playerPortrait"

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    return <>
        {/* <ReadinessBar icons={[]} /> */}
        <PlayerPortrait
            entityId='entity_adalbrecht'
            hp={atom(75)}
            maxHP={100}
        />
    </>
})

export = story