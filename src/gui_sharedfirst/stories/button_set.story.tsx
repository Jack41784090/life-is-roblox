import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import MainMenuButtonSet from "gui_sharedfirst/new_components/menu_ui/components/button_set"
import { getTestButtons } from "shared/utils"

const controls = {
    Visible: true,
}

const story = {
    react: React,
    reactRoblox: ReactRoblox,
    controls: controls,
    story: (props: { controls: typeof controls }) => {
        const component = <MainMenuButtonSet buttons={getTestButtons()} />
        return component
    }
}

export = story