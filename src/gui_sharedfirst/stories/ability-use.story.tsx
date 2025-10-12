import React from "@rbxts/react"
import ReactRoblox from "@rbxts/react-roblox"
import { AbilityUseEffect } from "gui_sharedfirst/new_components/effects"

const controls = {
    Visible: true,
}

const story = {
    react: React,
    reactRoblox: ReactRoblox,
    controls: controls,
    story: (props: { controls: typeof controls }) => {
        return <>
            <AbilityUseEffect
                position={new UDim2(0.5, 0, 0.5, 0)}
                abilityName="Fireball"
                color={Color3.fromRGB(255, 0, 0)}
            />
        </>
    }
}

export = story