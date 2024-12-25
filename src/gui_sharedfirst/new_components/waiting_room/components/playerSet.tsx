import * as React from 'react';
import WaitingRoomPlayerRow from './playerRow';

interface Props {
    players: Array<Player>;
}

interface State {
    testState: string;
}

export function WaitingRoomPlayerSet({ players }: Props) {
    return (
        <frame
            Size={UDim2.fromScale(0.5, 0.65)}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.5)}
            BackgroundTransparency={0.8}
            BackgroundColor3={Color3.fromRGB(255, 255, 255)}
        >
            {players.map((p, i) => <WaitingRoomPlayerRow key={i} text={p.Name} />)}
            <uilistlayout
                FillDirection={Enum.FillDirection.Vertical}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
            />
        </frame>
    );
}

export default WaitingRoomPlayerSet;