import { atom } from "@rbxts/charm"
import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar"

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    return <ReadinessBar icons={[
        {
            playerID: 1,
            iconUrl: "rbxassetid://123456",
            readiness: atom(0.25),
        },
        {
            playerID: 2,
            iconUrl: "rbxassetid://654321",
            readiness: atom(0.75),
        }
    ]} />
})

export = story