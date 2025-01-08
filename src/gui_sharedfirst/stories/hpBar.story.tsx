import { atom } from "@rbxts/charm"
import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory } from "@rbxts/ui-labs"
import HPBar from "gui_sharedfirst/new_components/battle/statusBar/hpBar"

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    return <HPBar hp={atom(70)} maxHP={100} />
})

export = story