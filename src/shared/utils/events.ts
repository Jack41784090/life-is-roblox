import { ReplicatedStorage } from "@rbxts/services";

const eventsFolder = ReplicatedStorage.WaitForChild("Events");
const _bindableEvents = eventsFolder.WaitForChild("BindableEvents").GetChildren() as BindableEvent[];
const _remoteEvents = eventsFolder.WaitForChild("RemoteEvents").GetChildren() as RemoteEvent[];
const _remoteFunctions = eventsFolder.WaitForChild("RemoteFunctions").GetChildren() as RemoteFunction[];

export const bindableEventsMap = _bindableEvents.reduce((acc, event) => {
    acc[event.Name] = event;
    return acc;
}, {} as { [key: string]: BindableEvent });
export const remoteFunctionsMap = _remoteFunctions.reduce((acc, event) => {
    acc[event.Name] = event;
    return acc;
}, {} as { [key: string]: RemoteFunction });
export const remoteEventsMap = _remoteEvents.reduce((acc, event) => {
    acc[event.Name] = event;
    return acc;
}, {} as { [key: string]: RemoteEvent });
