import { atom } from "@rbxts/charm"
import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { CreateReactStory, Number } from "@rbxts/ui-labs"
import LoadingScreenElement from "gui_sharedfirst/new_components/loading"

const story = CreateReactStory({
    controls: {
        progress: Number(0.5, 0, 1, 0.01, true),
    },
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    return <LoadingScreenElement progress={atom(props.controls.progress)} />
})

export = story