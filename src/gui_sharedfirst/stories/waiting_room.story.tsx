import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { Players } from "@rbxts/services"
import WaitingRoomElement from "gui_sharedfirst/new_components/waiting_room"

const controls = {
    Visible: true,
}

const story = {
    react: React,
    reactRoblox: ReactRoblox,
    controls: controls,
    story: ({ }) => {
        const component = <WaitingRoomElement
            players={[Players.LocalPlayer]}
            readyButtonClicked={() => print("Ready button clicked")}
        />
        return component
    }
}

export = story