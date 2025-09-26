import { atom } from "@rbxts/charm";
import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { CreateReactStory } from "@rbxts/ui-labs";
import { EntityUpdate } from "squad-battle/type";
import PlayerPortrait from "../squad-battle/entity/PlayerPortrait";

const story = CreateReactStory({
    react: React,
    reactRoblox: ReactRoblox,
}, (props) => {
    const [damageAmount, setDamageAmount] = React.useState(25);
    const [triggerDamage, setTriggerDamage] = React.useState(0);
    const hp = atom(100);

    // Create mock entity updates when damage is triggered
    const mockEntityUpdates: EntityUpdate[] = React.useMemo(() => {
        if (triggerDamage === 0) return [];

        return [{
            source: 2, // Attacker ID
            affected: 1, // This entity's ID
            change: {
                property: "HP" as any, // Cast to avoid type issues
                from: 100,
                to: 100 - damageAmount
            }
        }];
    }, [triggerDamage, damageAmount]);

    return (
        <screengui ResetOnSpawn={false}>
            <frame
                Size={UDim2.fromScale(1, 1)}
                BackgroundColor3={new Color3(0.1, 0.1, 0.15)}
            >
                {/* Controls */}
                <frame
                    Position={UDim2.fromScale(0.05, 0.05)}
                    Size={UDim2.fromScale(0.4, 0.3)}
                    BackgroundColor3={new Color3(0.2, 0.2, 0.25)}
                    BorderSizePixel={0}
                >
                    <uilistlayout
                        FillDirection={Enum.FillDirection.Vertical}
                        Padding={new UDim(0, 10)}
                    />
                    <textlabel
                        Size={UDim2.fromScale(1, 0.3)}
                        Text={`Damage Amount: ${damageAmount}`}
                        BackgroundTransparency={1}
                        TextColor3={new Color3(1, 1, 1)}
                        TextScaled={true}
                    />
                    <textbutton
                        Size={UDim2.fromScale(1, 0.3)}
                        Text="Trigger Damage"
                        BackgroundColor3={new Color3(0.8, 0.2, 0.2)}
                        TextColor3={new Color3(1, 1, 1)}
                        TextScaled={true}
                        Event={{
                            Activated: () => {
                                setTriggerDamage(prev => prev + 1);
                                hp(prev => prev - damageAmount);
                            }
                        }}
                    />
                </frame>

                {/* Player Portrait */}
                <frame
                    Position={UDim2.fromScale(0.5, 0.3)}
                    Size={UDim2.fromScale(0.3, 0.5)}
                    BackgroundTransparency={1}
                    AnchorPoint={new Vector2(0.5, 0)}
                >
                    <PlayerPortrait
                        entityId="entity_1"
                        hp={hp}
                        maxHP={100}
                        entityUpdates={mockEntityUpdates}
                    />
                </frame>
            </frame>
        </screengui>
    );
});

export = story;