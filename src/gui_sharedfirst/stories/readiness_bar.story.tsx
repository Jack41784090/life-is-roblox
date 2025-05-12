import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import ReadinessBar from "gui_sharedfirst/new_components/battle/readiness_bar"

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    return <ReadinessBar icons={[]} />
})

export = story