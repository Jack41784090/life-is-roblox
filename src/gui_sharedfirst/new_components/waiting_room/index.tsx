import React from "@rbxts/react";
import WaitingRoomBackground from "./components/background";
import WaitingRoomPlayerSet from "./components/playerSet";
import WaitingRoomReadyButton from "./components/ready_button";

interface Props {
    players: Array<Player>;
    readyButtonClicked: () => void;
}

function WaitingRoomElement(props: Props) {
    return (
        <WaitingRoomBackground>
            <frame
                Size={UDim2.fromScale(0.85, 0.85)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                BackgroundTransparency={1}
            >
                <WaitingRoomPlayerSet players={props.players} />
                <WaitingRoomReadyButton mouseClicked={props.readyButtonClicked} />
            </frame>
        </WaitingRoomBackground>
    );
}

export = WaitingRoomElement