import Roact from "@rbxts/roact";

interface RaedinessBarElementProps { }
interface ReadinessBarElementState { }
export default class ReadinessBarElement extends Roact.Component<RaedinessBarElementProps, ReadinessBarElementState> {
    constructor(props: RaedinessBarElementProps) {
        super(props);
    }

    render() {
        return (
            <frame
                Key={"ReadinessBar"}
                Position={new UDim2(0.05, 0, 0.1, 0)}
                Size={new UDim2(0.005, 0, 0.8, 0)}
                BackgroundTransparency={0.25}
                BackgroundColor3={new Color3(1, 0.03, 0.03)}
                BorderColor3={new Color3(0, 0, 0)}
                BorderSizePixel={2}
            >
                {this.props[Roact.Children]}
            </frame>
        );
    }
}
