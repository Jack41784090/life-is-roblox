import React, { useCallback, useEffect, useMemo, useState } from "@rbxts/react";
import { SquadEntity } from "squad-battle/Entity";
import { SquadEntityInSquadLocation } from "squad-battle/type";
import { SquadDisplayProps } from "../type";
import LocationLine from "./LocationLine";

function SquadDisplay(props: SquadDisplayProps) {
    warn(` | | SquadDisplay ${math.random() * 100 / 100}`);

    const [frontlineLocal, setFrontlineLocal] = useState(props.entities.filter(entity => entity.changeableStats.LOC() === SquadEntityInSquadLocation.front));
    const [middleLocal, setMiddleLocal] = useState(props.entities.filter(entity => entity.changeableStats.LOC() === SquadEntityInSquadLocation.middle));
    const [backlineLocal, setBacklineLocal] = useState(props.entities.filter(entity => entity.changeableStats.LOC() === SquadEntityInSquadLocation.back));
    const [immigrationlineup, setImmigrationLineup] = useState<{ id: number, location: SquadEntityInSquadLocation }[]>([]);
    // const [immigration_heartbeatscript, setImmigrationHeartbeatScript] = useState<RBXScriptConnection | undefined>();

    const entityUpdateModification = useMemo(() => {
        warn(` | | SquadDisplay: new entities update`);
        props.entityUpdates?.forEach(u => {
            // u.atSecond -= props.getTimer();

            if (u.change.property === 'LOC') {
                u.onComplete = () => {
                    const foundEntity = props.entities.find(e => e.playerID === u.affected);
                    if (!foundEntity) {
                        warn(` | | Entity not found: ${u.affected}`);
                    }
                    if (foundEntity) {
                        transferEntityToLocation(foundEntity, u.change.to);
                    }
                }
            }
        })
    }, [props.entityUpdates])

    const transferEntityToLocation = useCallback((entity: SquadEntity, newLocation: SquadEntityInSquadLocation) => {
        warn(` | transfer: ${entity.playerID} to ${SquadEntityInSquadLocation[newLocation]}`);

        // Use functional updates to work with current state, not stale captured state
        const removeFromAll = (prev: SquadEntity[]) => {
            const filtered = prev.filter(e => e.playerID !== entity.playerID);
            warn(` || ${prev.map(e => e.playerID).join(',')} || ${filtered.size() !== prev.size() ? `\n || ${filtered.map(e => e.playerID).join(',')} ||` : ''}`);
            return filtered;
        };
        const addToLocation = (prev: SquadEntity[]) => {
            // Check if entity is already in this location
            if (prev.some(e => e.playerID === entity.playerID)) {
                // warn(` |  | addToLocation: already here ${prev.size()} -> ${prev.size()}`);
                warn(` || ${prev.map(e => e.playerID).join(',')} ||`);
                return prev;
            }
            const filtered = prev.filter(e => e.playerID !== entity.playerID);
            const result = [...filtered, entity];
            warn(` || ${prev.map(e => e.playerID).join(',')} + ${entity.playerID} || \n || ${result.map(e => e.playerID).join(',')} ||`);
            return result;
        };

        switch (newLocation) {
            case SquadEntityInSquadLocation.front:
                setFrontlineLocal(addToLocation);
                setMiddleLocal(removeFromAll);
                setBacklineLocal(removeFromAll);
                break;
            case SquadEntityInSquadLocation.middle:
                setFrontlineLocal(removeFromAll);
                setMiddleLocal(addToLocation);
                setBacklineLocal(removeFromAll);
                break;
            case SquadEntityInSquadLocation.back:
                setFrontlineLocal(removeFromAll);
                setMiddleLocal(removeFromAll);
                setBacklineLocal(addToLocation);
                break;
        }

        warn(` | transfer complete: ${entity.playerID} to ${SquadEntityInSquadLocation[newLocation]}`);
    }, []);
    const handleImmigration = useCallback(() => {
        setImmigrationLineup((currentLineup) => {
            if (currentLineup.size() === 0) {
                return currentLineup;
            }
            const handle = currentLineup[0];
            const foundEntity = props.entities.find(e => e.playerID === handle.id);
            if (foundEntity) {
                transferEntityToLocation(foundEntity, handle.location);
                return currentLineup.filter(item => item.id !== handle.id);
            }
            return currentLineup;
        });
    }, [props.entities, transferEntityToLocation])
    const queueImmigration = useCallback((entity: SquadEntity, location: SquadEntityInSquadLocation) => {
        warn(`queue: ${entity.playerID} to ${SquadEntityInSquadLocation[location]}`);
        setImmigrationLineup(prev => [...prev, { id: entity.playerID, location }]);
    }, []);

    useEffect(() => {
        if (immigrationlineup.size() === 0) {
            print(` || done ||`);
        } else {
            warn(` || immigration detected: ${immigrationlineup.size()} ||`);
            handleImmigration();
        }
    }, [immigrationlineup, handleImmigration])

    // task.delay(props.syncAfterSecond, () => {
    //     setFrontlineLocal(entitiesRealLocation[SquadEntityInSquadLocation.front] as SquadEntity[]);
    //     setMiddleLocal(entitiesRealLocation[SquadEntityInSquadLocation.middle] as SquadEntity[]);
    //     setBacklineLocal(entitiesRealLocation[SquadEntityInSquadLocation.back] as SquadEntity[]);
    // });

    // const frontlineLocal = entitiesRealLocation[SquadEntityInSquadLocation.front] as SquadEntity[];
    // const middleLocal = entitiesRealLocation[SquadEntityInSquadLocation.middle] as SquadEntity[];
    // const backlineLocal = entitiesRealLocation[SquadEntityInSquadLocation.back] as SquadEntity[];
    // const queueImmigration = (entity: SquadEntity, location: SquadEntityInSquadLocation) => {
    //     warn(`(no-op) queue: ${entity.playerID} to ${SquadEntityInSquadLocation[location]}`);
    // };

    const topsection =
        <LocationLine
            getTimer={props.getTimer}
            key={`LocationLine-TopSection`}
            title="FRONT LINE"
            entities={props.upsideDown ? backlineLocal : frontlineLocal}
            location={props.upsideDown ? SquadEntityInSquadLocation.back : SquadEntityInSquadLocation.front}
            entityUpdates={props.entityUpdates}
            upsideDown={props.upsideDown}
            transferFunction={queueImmigration}
        />;

    const middlesection =
        <LocationLine
            getTimer={props.getTimer}
            key={`LocationLine-MiddleSection`}
            title="MIDDLE LINE"
            entities={middleLocal}
            location={SquadEntityInSquadLocation.middle}
            entityUpdates={props.entityUpdates}
            upsideDown={props.upsideDown}
            transferFunction={queueImmigration}
        />;

    const bottomSection =
        <LocationLine
            getTimer={props.getTimer}
            key={`LocationLine-BottomSection`}
            title="BACK LINE"
            entities={props.upsideDown ? frontlineLocal : backlineLocal}
            location={props.upsideDown ? SquadEntityInSquadLocation.front : SquadEntityInSquadLocation.back}
            entityUpdates={props.entityUpdates}
            upsideDown={props.upsideDown}
            transferFunction={queueImmigration}
        />;

    return (
        <frame
            // Position={props.position || new UDim2(0, 0, 0, 0)}
            Position={UDim2.fromScale(0, .5)}
            Size={UDim2.fromScale(math.min(0.6, 1 / props.teamSize * .8), 1)}
            // BackgroundColor3={new Color3(0.15, 0.15, 0.15)}
            BackgroundTransparency={.90}
            BorderColor3={new Color3(0.6, 0.6, 0.6)}
            BorderSizePixel={1}
        >
            <uilistlayout
                FillDirection={Enum.FillDirection.Vertical}
                SortOrder={Enum.SortOrder.LayoutOrder}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                VerticalAlignment={Enum.VerticalAlignment.Top}
            />
            {topsection}
            {middlesection}
            {bottomSection}
        </frame>
    );
}

export = SquadDisplay;