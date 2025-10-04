import React, { useMemo } from "@rbxts/react";
import EntityDisplay from "../entity/EntityDisplay";
import { getLocationColor } from "../shared/utils";
import { LocationLineProps } from "../type";

const LocationLine = React.memo((props: LocationLineProps) => {
    warn(` | | | LocationLine ${math.random() * 100 / 100}`);
    const lineColor = getLocationColor(props.location);

    const entityIDs = useMemo(() => {
        return props.entities.map(e => e.playerID).join(',');
    }, [props.entities]);

    const entityUpdatesKey = useMemo(() => {
        if (!props.entityUpdates) return "";
        return props.entityUpdates.map(u => {
            const baseKey = `${u.source}->${u.affected}`;
            const changeStr = `${u.change.property}`;
            const valueStr = typeOf(u.change) === "table" && "from" in u.change ? `${u.change.from}to${u.change.to}` : "";
            const timeStr = `@${math.floor(u.atSecond * 100) / 100}`;
            return `${baseKey}:${changeStr}${valueStr}${timeStr}`;
        }).join("|");
    }, [props.entityUpdates]);

    const entityUpdatesMap = useMemo(() => {
        const map = new Map<number, typeof props.entityUpdates>();

        props.entities.forEach(entity => {
            const relevantUpdates = props.entityUpdates?.filter(update =>
                (update.affected === entity.playerID || update.source === entity.playerID) && !update.done
            )
            // .map(u => {
            //     if (u.done) {
            //         warn(` | | | | LocationLine:${props.location} Skipping done update for ${entity.playerID}`);
            //         return undefined;
            //     }
            //     if (u.affected === entity.playerID && u.change.property === 'LOC') {
            //         return {
            //             ...u,
            //             onComplete: () => {
            //                 props.transferFunction(entity, u.change.to);
            //             }
            //         };
            //     }
            //     return u;
            // }).filterUndefined() || [];

            map.set(entity.playerID, relevantUpdates);
        });

        return map;
    }, [entityUpdatesKey, entityIDs]);

    return (
        <frame Size={UDim2.fromScale(1, 1 / 3)} BackgroundTransparency={1}>
            <textlabel
                Text={props.title}
                Size={UDim2.fromScale(1, 0.2)}
                BackgroundTransparency={1}
                TextColor3={lineColor}
                Font={Enum.Font.SourceSansBold}
                TextScaled={true}
            />
            <frame
                // key={`LocationLine-${props.location}-Entities`}
                Position={UDim2.fromScale(0, 0.1)}
                Size={UDim2.fromScale(1, 0.9)}
                BackgroundTransparency={1}
            >
                <uilistlayout
                    FillDirection={Enum.FillDirection.Horizontal}
                    SortOrder={Enum.SortOrder.LayoutOrder}
                    // Padding={new UDim(0, 10)}
                    HorizontalAlignment={Enum.HorizontalAlignment.Center}
                    VerticalAlignment={Enum.VerticalAlignment.Center}
                />

                {props.entities.map((entity) => {
                    const relevantUpdates = entityUpdatesMap.get(entity.playerID) || [];

                    return (
                        <EntityDisplay
                            key={entity.playerID}
                            entity={entity}
                            entityUpdates={relevantUpdates}
                            upsideDown={props.upsideDown}
                            transferFunction={props.transferFunction}
                        />
                    );
                })}
            </frame>
        </frame>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if meaningful props changed
    if (prevProps.location !== nextProps.location) return false;
    if (prevProps.title !== nextProps.title) return false;
    if (prevProps.upsideDown !== nextProps.upsideDown) return false;
    if (prevProps.transferFunction !== nextProps.transferFunction) return false;

    // Compare entities by IDs
    const prevEntityIDs = prevProps.entities.map(e => e.playerID).join(',');
    const nextEntityIDs = nextProps.entities.map(e => e.playerID).join(',');
    if (prevEntityIDs !== nextEntityIDs) {
        warn(`[LocationLine:${nextProps.location}] Entity IDs changed: "${prevEntityIDs}" -> "${nextEntityIDs}"`);
        return false;
    }

    // Compare entityUpdates by content (create hash)
    const prevUpdatesKey = prevProps.entityUpdates?.map(u => {
        const baseKey = `${u.source}->${u.affected}`;
        const changeStr = `${u.change.property}`;
        const valueStr = typeOf(u.change) === "table" && "from" in u.change ? `${u.change.from}to${u.change.to}` : "";
        const timeStr = `@${math.floor(u.atSecond * 100) / 100}`;
        return `${baseKey}:${changeStr}${valueStr}${timeStr}`;
    }).join("|") || "";

    const nextUpdatesKey = nextProps.entityUpdates?.map(u => {
        const baseKey = `${u.source}->${u.affected}`;
        const changeStr = `${u.change.property}`;
        const valueStr = typeOf(u.change) === "table" && "from" in u.change ? `${u.change.from}to${u.change.to}` : "";
        const timeStr = `@${math.floor(u.atSecond * 100) / 100}`;
        return `${baseKey}:${changeStr}${valueStr}${timeStr}`;
    }).join("|") || "";

    if (prevUpdatesKey !== nextUpdatesKey) {
        warn(`[LocationLine:${nextProps.location}] Updates changed: ${prevUpdatesKey.sub(1, 50)}... -> ${nextUpdatesKey.sub(1, 50)}...`);
        return false;
    }

    // All props are effectively equal, skip re-render
    warn(`[LocationLine:${nextProps.location}] Props unchanged, skipping re-render`);
    return true;
}); export = LocationLine;