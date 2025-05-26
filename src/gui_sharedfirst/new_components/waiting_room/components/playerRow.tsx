import { useMotion } from '@rbxts/pretty-react-hooks';
import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';
import { springs } from 'shared/utils';

export interface Props {
    player: Player;
    isReady: boolean;
    isHost: boolean;
    isLocalPlayer: boolean;
}

export function WaitingRoomPlayerRow({ player, isReady, isHost, isLocalPlayer }: Props) {
    const [hovered, setHovered] = React.useState(false);
    const [charge, chargeMotion] = useMotion(0);
    const [readyScale, readyMotion] = useMotion(isReady ? 1 : 0);

    React.useEffect(() => {
        if (hovered) {
            chargeMotion.spring(1, springs.slow);
        } else {
            chargeMotion.spring(0, springs.responsive)
        }
    }, [hovered]);

    React.useEffect(() => {
        readyMotion.spring(isReady ? 1 : 0, springs.responsive);
    }, [isReady]);

    const playerDisplayName = isLocalPlayer ? `${player.Name} (You)` : player.Name;
    const hostSuffix = isHost ? " (Host)" : "";

    return (
        <frame
            Size={UDim2.fromScale(1, 0.12)}
            BackgroundTransparency={1}
            Event={{
                MouseEnter: () => setHovered(true),
                MouseLeave: () => setHovered(false),
            }}
        >
            <frame
                Size={UDim2.fromScale(1, 1)}
                BackgroundTransparency={0.15}
                BackgroundColor3={isLocalPlayer ? Color3.fromRGB(40, 40, 60) : Color3.fromRGB(20, 20, 25)}
                BorderSizePixel={0}
            >
                <uicorner CornerRadius={new UDim(0, 8)} />
                <uistroke
                    Color={isLocalPlayer ? CONDOR_BLOOD_RED : Color3.fromRGB(60, 60, 60)}
                    Thickness={2}
                />

                <frame
                    Size={UDim2.fromScale(0.12, 0.8)}
                    Position={UDim2.fromScale(0.02, 0.1)}
                    BackgroundTransparency={0}
                    BackgroundColor3={Color3.fromRGB(40, 40, 40)}
                    BorderSizePixel={0}
                >
                    <uicorner CornerRadius={new UDim(1, 0)} />
                    <imagelabel
                        Size={UDim2.fromScale(1, 1)}
                        BackgroundTransparency={1}
                        Image={`rbxthumb://type=AvatarHeadShot&id=${player.UserId}&w=150&h=150`}
                        ScaleType={Enum.ScaleType.Crop}
                    >
                        <uicorner CornerRadius={new UDim(1, 0)} />
                    </imagelabel>
                </frame>

                <textlabel
                    Text={playerDisplayName + hostSuffix}
                    Font={Enum.Font.Antique}
                    TextColor3={Color3.fromRGB(255, 255, 255)}
                    TextSize={18}
                    Size={UDim2.fromScale(0.6, 0.4)}
                    Position={UDim2.fromScale(0.16, 0.1)}
                    BackgroundTransparency={1}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    TextYAlignment={Enum.TextYAlignment.Center}
                />

                <textlabel
                    Text={`Level ${math.random(1, 50)}`}
                    Font={Enum.Font.Antique}
                    TextColor3={Color3.fromRGB(180, 180, 180)}
                    TextSize={14}
                    Size={UDim2.fromScale(0.6, 0.3)}
                    Position={UDim2.fromScale(0.16, 0.5)}
                    BackgroundTransparency={1}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    TextYAlignment={Enum.TextYAlignment.Center}
                />

                <frame
                    Size={readyScale.map(s => UDim2.fromScale(0.08 * s, 0.08 * s))}
                    Position={UDim2.fromScale(0.88, 0.46)}
                    AnchorPoint={new Vector2(0.5, 0.5)}
                    BackgroundTransparency={0}
                    BackgroundColor3={isReady ? Color3.fromRGB(0, 180, 0) : Color3.fromRGB(80, 80, 80)}
                    BorderSizePixel={0}
                    Visible={readyScale.map(s => s > 0.1)}
                >
                    <uicorner CornerRadius={new UDim(1, 0)} />
                    <textlabel
                        Text={isReady ? "✓" : "○"}
                        Font={Enum.Font.SourceSansBold}
                        TextColor3={Color3.fromRGB(255, 255, 255)}
                        TextSize={16}
                        Size={UDim2.fromScale(1, 1)}
                        BackgroundTransparency={1}
                        TextXAlignment={Enum.TextXAlignment.Center}
                        TextYAlignment={Enum.TextYAlignment.Center}
                    />
                </frame>

                <frame
                    AnchorPoint={new Vector2(0, 1)}
                    Size={charge.map(v => UDim2.fromScale(v, 0.02))}
                    BackgroundTransparency={0}
                    Position={UDim2.fromScale(0, 1)}
                    BackgroundColor3={CONDOR_BLOOD_RED}
                    BorderSizePixel={0}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                </frame>
            </frame>
        </frame>
    );
}

export default WaitingRoomPlayerRow;