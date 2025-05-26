import { useMotion } from '@rbxts/pretty-react-hooks';
import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';
import { springs } from 'shared/utils';

interface Props {
    isReady: boolean;
    isHost: boolean;
    allPlayersReady: boolean;
    onToggleReady: () => void;
    onStartGame: () => void;
    countdownTime?: number;
}

export function WaitingRoomControlPanel({
    isReady,
    isHost,
    allPlayersReady,
    onToggleReady,
    onStartGame,
    countdownTime
}: Props) {
    const [readyHovered, setReadyHovered] = React.useState(false);
    const [startHovered, setStartHovered] = React.useState(false);
    const [readyCharge, readyChargeMotion] = useMotion(0);
    const [startCharge, startChargeMotion] = useMotion(0);

    React.useEffect(() => {
        if (readyHovered) {
            readyChargeMotion.spring(1, springs.slow);
        } else {
            readyChargeMotion.spring(0, springs.responsive);
        }
    }, [readyHovered]);

    React.useEffect(() => {
        if (startHovered) {
            startChargeMotion.spring(1, springs.slow);
        } else {
            startChargeMotion.spring(0, springs.responsive);
        }
    }, [startHovered]);

    const readyButtonText = isReady ? "Cancel Ready" : "Ready Up";
    const readyButtonColor = isReady ? Color3.fromRGB(200, 100, 0) : Color3.fromRGB(0, 180, 0);

    return (
        <frame
            Size={UDim2.fromScale(1, 0.25)}
            Position={UDim2.fromScale(0, 0.75)}
            BackgroundTransparency={1}
        >
            {countdownTime !== undefined && (
                <frame
                    Size={UDim2.fromScale(0.3, 0.4)}
                    Position={UDim2.fromScale(0.35, 0.1)}
                    AnchorPoint={new Vector2(0.5, 0)}
                    BackgroundTransparency={0.1}
                    BackgroundColor3={Color3.fromRGB(20, 20, 20)}
                    BorderSizePixel={0}
                >
                    <uicorner CornerRadius={new UDim(0, 8)} />
                    <uistroke Color={CONDOR_BLOOD_RED} Thickness={2} />

                    <textlabel
                        Text={`Starting in ${countdownTime}s`}
                        Font={Enum.Font.SourceSansBold}
                        TextColor3={CONDOR_BLOOD_RED}
                        TextSize={24}
                        Size={UDim2.fromScale(1, 1)}
                        BackgroundTransparency={1}
                        TextXAlignment={Enum.TextXAlignment.Center}
                        TextYAlignment={Enum.TextYAlignment.Center}
                    />
                </frame>
            )}

            <textbutton
                Text={readyButtonText}
                Font={Enum.Font.Antique}
                TextColor3={Color3.fromRGB(255, 255, 255)}
                TextSize={20}
                Size={UDim2.fromScale(0.25, 0.5)}
                Position={UDim2.fromScale(0.2, 0.6)}
                BackgroundTransparency={0.1}
                BackgroundColor3={Color3.fromRGB(20, 20, 20)}
                TextXAlignment={Enum.TextXAlignment.Center}
                TextYAlignment={Enum.TextYAlignment.Center}
                Event={{
                    Activated: onToggleReady,
                    MouseEnter: () => setReadyHovered(true),
                    MouseLeave: () => setReadyHovered(false),
                }}
            >
                <uistroke Color={readyButtonColor} Thickness={3} />
                <uicorner CornerRadius={new UDim(0, 8)} />

                <frame
                    AnchorPoint={new Vector2(0, 1)}
                    Size={readyCharge.map(v => UDim2.fromScale(v, 0.08))}
                    BackgroundTransparency={0}
                    Position={UDim2.fromScale(0, 1)}
                    BackgroundColor3={readyButtonColor}
                    BorderSizePixel={0}
                >
                    <uicorner CornerRadius={new UDim(0, 6)} />
                </frame>
            </textbutton>

            {isHost && (
                <textbutton
                    Text="Start Game"
                    Font={Enum.Font.Antique}
                    TextColor3={allPlayersReady ? Color3.fromRGB(255, 255, 255) : Color3.fromRGB(120, 120, 120)}
                    TextSize={20}
                    Size={UDim2.fromScale(0.25, 0.5)}
                    Position={UDim2.fromScale(0.55, 0.6)}
                    BackgroundTransparency={0.1}
                    BackgroundColor3={Color3.fromRGB(20, 20, 20)}
                    TextXAlignment={Enum.TextXAlignment.Center}
                    TextYAlignment={Enum.TextYAlignment.Center}
                    Active={allPlayersReady}
                    Event={{
                        Activated: allPlayersReady ? onStartGame : () => { },
                        MouseEnter: () => allPlayersReady && setStartHovered(true),
                        MouseLeave: () => setStartHovered(false),
                    }}
                >
                    <uistroke
                        Color={allPlayersReady ? CONDOR_BLOOD_RED : Color3.fromRGB(80, 80, 80)}
                        Thickness={3}
                    />
                    <uicorner CornerRadius={new UDim(0, 8)} />

                    <frame
                        AnchorPoint={new Vector2(0, 1)}
                        Size={startCharge.map(v => UDim2.fromScale(v, 0.08))}
                        BackgroundTransparency={0}
                        Position={UDim2.fromScale(0, 1)}
                        BackgroundColor3={CONDOR_BLOOD_RED}
                        BorderSizePixel={0}
                        Visible={allPlayersReady}
                    >
                        <uicorner CornerRadius={new UDim(0, 6)} />
                    </frame>
                </textbutton>
            )}

            <textlabel
                Text={allPlayersReady ? "All players ready!" : "Waiting for players..."}
                Font={Enum.Font.Antique}
                TextColor3={allPlayersReady ? Color3.fromRGB(0, 200, 0) : Color3.fromRGB(180, 180, 180)}
                TextSize={16}
                Size={UDim2.fromScale(1, 0.3)}
                Position={UDim2.fromScale(0, 0.15)}
                BackgroundTransparency={1}
                TextXAlignment={Enum.TextXAlignment.Center}
                TextYAlignment={Enum.TextYAlignment.Center}
            />
        </frame>
    );
}

export default WaitingRoomControlPanel;
