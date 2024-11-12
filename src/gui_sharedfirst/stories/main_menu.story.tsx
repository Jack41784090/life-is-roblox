import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import MainMenuElement from "gui_sharedfirst/new_components/menu_ui"
import { getTestButtons } from "shared/utils"

const controls = {
    Visible: true,
}

const story = {
    react: React,
    reactRoblox: ReactRoblox,
    controls: controls,
    story: (props: { controls: typeof controls }) => {
        const component = <MainMenuElement buttons={getTestButtons()} title={"Condor"} />
        return component
    }
}

export = story