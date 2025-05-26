import * as React from 'react';
import WaitingRoomPlayerRow from './playerRow';

interface Props {
    players: Array<Player>;
    readyStates: Map<number, boolean>;
    hostUserId?: number;
    localPlayer: Player;
}

export function WaitingRoomPlayerSet({ players, readyStates, hostUserId, localPlayer }: Props) {
    return (
        <frame
            Size={UDim2.fromScale(0.95, 0.6)}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.45)}
            BackgroundTransparency={0.95}
            BackgroundColor3={Color3.fromRGB(0, 0, 0)}
            BorderSizePixel={0}
        >
            <uicorner CornerRadius={new UDim(0, 12)} />

            <textlabel
                Text={`Players (${players.size()}/8)`}
                Font={Enum.Font.Antique}
                TextColor3={Color3.fromRGB(255, 255, 255)}
                TextSize={24}
                Size={UDim2.fromScale(1, 0.15)}
                Position={UDim2.fromScale(0, 0)}
                BackgroundTransparency={1}
                TextXAlignment={Enum.TextXAlignment.Left}
                TextYAlignment={Enum.TextYAlignment.Center}
            >
                <uipadding
                    PaddingLeft={new UDim(0, 20)}
                    PaddingTop={new UDim(0, 10)}
                />
            </textlabel>

            <scrollingframe
                Size={UDim2.fromScale(1, 0.8)}
                Position={UDim2.fromScale(0, 0.2)}
                BackgroundTransparency={1}
                BorderSizePixel={0}
                ScrollBarThickness={8}
                ScrollBarImageColor3={Color3.fromRGB(100, 100, 100)}
                CanvasSize={UDim2.fromScale(0, players.size() * 0.15)}
                ScrollingDirection={Enum.ScrollingDirection.Y}
            >
                {players.map((player, i) => (
                    <WaitingRoomPlayerRow
                        key={player.UserId}
                        player={player}
                        isReady={readyStates.get(player.UserId) || false}
                        isHost={player.UserId === hostUserId}
                        isLocalPlayer={player.UserId === localPlayer.UserId}
                    />
                ))}
                <uilistlayout
                    FillDirection={Enum.FillDirection.Vertical}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    Padding={new UDim(0, 8)}
                >
                    <uipadding
                        PaddingLeft={new UDim(0, 15)}
                        PaddingRight={new UDim(0, 15)}
                        PaddingTop={new UDim(0, 10)}
                    />
                </uilistlayout>
            </scrollingframe>
        </frame>
    );
}

export default WaitingRoomPlayerSet;