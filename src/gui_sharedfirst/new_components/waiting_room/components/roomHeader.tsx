import { useMotion } from '@rbxts/pretty-react-hooks';
import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';
import { springs } from 'shared/utils';

interface Props {
    roomCode: string;
    onLeaveRoom: () => void;
}

export function WaitingRoomHeader({ roomCode, onLeaveRoom }: Props) {
    const [leaveHovered, setLeaveHovered] = React.useState(false);
    const [leaveCharge, leaveChargeMotion] = useMotion(0);

    React.useEffect(() => {
        if (leaveHovered) {
            leaveChargeMotion.spring(1, springs.slow);
        } else {
            leaveChargeMotion.spring(0, springs.responsive);
        }
    }, [leaveHovered]);

    return (
        <frame
            Size={UDim2.fromScale(1, 0.12)}
            Position={UDim2.fromScale(0, 0)}
            BackgroundTransparency={1}
        >
            <textlabel
                Text="Battle Lobby"
                Font={Enum.Font.Antique}
                TextColor3={Color3.fromRGB(255, 255, 255)}
                TextSize={32}
                Size={UDim2.fromScale(0.4, 1)}
                Position={UDim2.fromScale(0.05, 0)}
                BackgroundTransparency={1}
                TextXAlignment={Enum.TextXAlignment.Left}
                TextYAlignment={Enum.TextYAlignment.Center}
            />

            <frame
                Size={UDim2.fromScale(0.25, 0.6)}
                Position={UDim2.fromScale(0.45, 0.2)}
                BackgroundTransparency={0.1}
                BackgroundColor3={Color3.fromRGB(30, 30, 30)}
                BorderSizePixel={0}
            >
                <uicorner CornerRadius={new UDim(0, 8)} />
                <uistroke Color={CONDOR_BLOOD_RED} Thickness={2} />

                <textlabel
                    Text="Room Code:"
                    Font={Enum.Font.Antique}
                    TextColor3={Color3.fromRGB(180, 180, 180)}
                    TextSize={14}
                    Size={UDim2.fromScale(0.45, 1)}
                    Position={UDim2.fromScale(0.05, 0)}
                    BackgroundTransparency={1}
                    TextXAlignment={Enum.TextXAlignment.Left}
                    TextYAlignment={Enum.TextYAlignment.Center}
                />

                <textlabel
                    Text={roomCode}
                    Font={Enum.Font.SourceSansBold}
                    TextColor3={CONDOR_BLOOD_RED}
                    TextSize={18}
                    Size={UDim2.fromScale(0.45, 1)}
                    Position={UDim2.fromScale(0.5, 0)}
                    BackgroundTransparency={1}
                    TextXAlignment={Enum.TextXAlignment.Center}
                    TextYAlignment={Enum.TextYAlignment.Center}
                />
            </frame>

            <textbutton
                Text="Leave Room"
                Font={Enum.Font.Antique}
                TextColor3={Color3.fromRGB(255, 255, 255)}
                TextSize={16}
                Size={UDim2.fromScale(0.15, 0.6)}
                Position={UDim2.fromScale(0.8, 0.2)}
                BackgroundTransparency={1}
                TextXAlignment={Enum.TextXAlignment.Center}
                TextYAlignment={Enum.TextYAlignment.Center}
                Event={{
                    Activated: onLeaveRoom,
                    MouseEnter: () => setLeaveHovered(true),
                    MouseLeave: () => setLeaveHovered(false),
                }}
            >
                <uistroke Color={Color3.fromRGB(200, 50, 50)} Thickness={2} />
                <uicorner CornerRadius={new UDim(0, 6)} />

                <frame
                    AnchorPoint={new Vector2(0, 1)}
                    Size={leaveCharge.map(v => UDim2.fromScale(v, 0.08))}
                    BackgroundTransparency={0}
                    Position={UDim2.fromScale(0, 1)}
                    BackgroundColor3={Color3.fromRGB(200, 50, 50)}
                    BorderSizePixel={0}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                </frame>
            </textbutton>
        </frame>
    );
}

export default WaitingRoomHeader;
