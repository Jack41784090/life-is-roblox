import React, { ReactComponent } from "@rbxts/react";
import { ReadinessIcon } from "shared/types/battle-types";
import ReadinessIconElement from "./readiness-icon";

interface ReadinessBarElementProps {
    icons: ReadinessIcon[]; // Array of image URLs or asset IDs for character icons
    refs: Map<number, React.RefObject<Frame>>;
}
interface ReadinessBarElementState { }

@ReactComponent
export class ReadinessBarElement extends React.Component<ReadinessBarElementProps, ReadinessBarElementState> {
    constructor(props: ReadinessBarElementProps) {
        super(props);
    }

    createIconElements(): React.Element[] {
        return this.props.icons.mapFiltered((icon, index) => {
            // Calculate the position based on readiness
            const iconRef = this.props.refs.get(icon.iconID);
            if (iconRef) {
                return (
                    <ReadinessIconElement
                        icon={icon}
                        index={index}
                        iconRef={iconRef}
                    />
                );
            }
        });
    }

    render() {
        return (
            <frame
                key={"ReadinessBar"}
                Position={new UDim2(0.05, 0, 0.1, 0)}
                Size={new UDim2(0.005, 0, 0.8, 0)}
                BackgroundTransparency={0.25}
                BackgroundColor3={new Color3(1, 0.03, 0.03)}
                BorderColor3={new Color3(0, 0, 0)}
                BorderSizePixel={2}
            >
                {this.createIconElements()}
            </frame>
        );
    }
}

export default ReadinessBarElement;
