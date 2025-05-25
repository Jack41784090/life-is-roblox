import React, { useEffect, useState } from "@rbxts/react";
import Entity from "shared/class/battle/State/Entity";
import { AbilityConfig } from "shared/class/battle/Systems/CombatSystem/Ability/types";
import { onInput } from "shared/utils";

interface AbilitySlotProps {
    cre: Entity;
    abKey: keyof typeof Enum.KeyCode;
    ability: AbilityConfig;
    focus?: boolean;
}

export function AbilitySlot({ cre, abKey, ability, focus = false }: AbilitySlotProps) {
    const [isFocused, setIsFocused] = useState(focus);

    const activateAbility = () => {
        setIsFocused(true);
        cre.armed = abKey;
    };

    useEffect(() => {
        const handleKeyPress = (input: InputObject) => {
            if (input.KeyCode.Name === abKey) {
                activateAbility();
            } else if (isFocused) {
                setIsFocused(false);
            }
        };

        const connection = onInput(Enum.UserInputType.Keyboard, handleKeyPress);
        return () => connection.Disconnect();
    }, [abKey, cre, isFocused]);

    return (
        <imagebutton
            Size={UDim2.fromScale(isFocused ? 0.25 : 0.2, 1)}
            Image={ability.icon}
            SizeConstraint={"RelativeXX"}
            Event={{
                MouseButton1Click: activateAbility
            }}
        >
            <uiaspectratioconstraint AspectRatio={1} />
        </imagebutton>
        // <imagebutton
        //     key={`${key}-${ability.name}`}
        //     Size={UDim2.fromScale(this.state.focus ? 0.25 : 0.2, 1)}
        //     Image={ability.icon}
        //     SizeConstraint={'RelativeXX'}
        //     Event={{
        //         MouseButton1Click: () => {

        //         }
        //     }}
        // >
        //     <uiaspectratioconstraint AspectRatio={1} />
        // </imagebutton>
    );
}

export default AbilitySlot;
