import React from "@rbxts/react";
import { Players, RunService } from "@rbxts/services";
import { clientRemotes, serverRemotes } from "shared/remote";
import WaitingRoomBackground from "./components/background";
import WaitingRoomControlPanel from "./components/controlPanel";
import WaitingRoomPlayerSet from "./components/playerSet";
import WaitingRoomHeader from "./components/roomHeader";

interface Props {
    players: Array<Player>;
    readyButtonClicked: () => void;
    onLeaveRoom?: () => void;
    roomCode?: string;
}

function WaitingRoomElement(props: Props) {
    const [readyStates, setReadyStates] = React.useState<Map<number, boolean>>(new Map());
    const [currentPlayers, setCurrentPlayers] = React.useState<Array<Player>>(props.players);
    const [countdownTime, setCountdownTime] = React.useState<number | undefined>(undefined);

    const localPlayer = Players.LocalPlayer;
    const hostUserId = currentPlayers[0]?.UserId;
    const isHost = localPlayer.UserId === hostUserId;
    const isLocalPlayerReady = readyStates.get(localPlayer.UserId) || false;
    const allPlayersReady = currentPlayers.every(player => readyStates.get(player.UserId) === true);

    React.useEffect(() => {
        const connection = clientRemotes.ui.updateRoom.connect((players, readyStateArray) => {
            setCurrentPlayers(players);
            setReadyStates(new Map(readyStateArray));
        });

        return connection;
    }, []);

    const handleToggleReady = () => {
        const newReadyState = !isLocalPlayerReady;
        serverRemotes.room.setReady.fire(newReadyState);
        setReadyStates(prev => {
            const entries: Array<[number, boolean]> = [];
            prev.forEach((value, key) => {
                entries.push([key, value]);
            });
            entries.push([localPlayer.UserId, newReadyState]);
            return new Map(entries);
        });
    };

    const startCountdown = () => {
        let time = 5;
        setCountdownTime(time);

        const startTime = tick();
        const connection = RunService.Heartbeat.Connect(() => {
            const elapsed = tick() - startTime;
            const remaining = math.max(0, time - math.floor(elapsed));
            setCountdownTime(remaining);

            if (remaining <= 0) {
                connection.Disconnect();
                setCountdownTime(undefined);
                props.readyButtonClicked();
            }
        });
    };

    const handleStartGame = () => {
        if (allPlayersReady && isHost) {
            startCountdown();
        }
    };

    const handleLeaveRoom = () => {
        serverRemotes.room.leave.fire();
        if (props.onLeaveRoom) {
            props.onLeaveRoom();
        }
    };

    const generateRoomCode = () => {
        if (props.roomCode) return props.roomCode;
        return `${math.random(1000, 9999)}`;
    };

    React.useEffect(() => {
        const initialReadyStates = new Map<number, boolean>();
        currentPlayers.forEach(player => {
            if (!readyStates.has(player.UserId)) {
                initialReadyStates.set(player.UserId, false);
            }
        });
        if (initialReadyStates.size() > 0) {
            setReadyStates(prev => {
                const entries: Array<[number, boolean]> = [];
                prev.forEach((value, key) => {
                    entries.push([key, value]);
                });
                initialReadyStates.forEach((value, key) => {
                    entries.push([key, value]);
                });
                return new Map(entries);
            });
        }
    }, [currentPlayers]);

    return (
        <WaitingRoomBackground>
            <frame
                Size={UDim2.fromScale(0.9, 0.9)}
                AnchorPoint={new Vector2(0.5, 0.5)}
                Position={UDim2.fromScale(0.5, 0.5)}
                BackgroundTransparency={1}
            >
                <WaitingRoomHeader
                    roomCode={generateRoomCode()}
                    onLeaveRoom={handleLeaveRoom}
                />

                <WaitingRoomPlayerSet
                    players={props.players}
                    readyStates={readyStates}
                    hostUserId={hostUserId}
                    localPlayer={localPlayer}
                />

                <WaitingRoomControlPanel
                    isReady={isLocalPlayerReady}
                    isHost={isHost}
                    allPlayersReady={allPlayersReady}
                    onToggleReady={handleToggleReady}
                    onStartGame={handleStartGame}
                    countdownTime={countdownTime}
                />
            </frame>
        </WaitingRoomBackground>
    );
}

export = WaitingRoomElement