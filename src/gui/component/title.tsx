import Roact from "@rbxts/roact";
import { RunService } from "@rbxts/services";

interface TitleElementProps {
    text: string;
}
interface TitleElementState {
    colour: Color3;
}
export default class TitleElement extends Roact.Component<TitleElementProps, TitleElementState> {
    private running: boolean = true;
    private connection: RBXScriptConnection | undefined;

    state: TitleElementState = {
        colour: new Color3(1, 1, 1),
    };

    constructor(props: TitleElementProps) {
        super(props);
        this.setState({
            colour: new Color3(1, 1, 1),
        });
    }

    protected didMount(): void {
        this.connection = RunService.RenderStepped.Connect(() => {
            if (this.running) {
                const hue = (tick() % 5) / 5;
                this.setState({
                    colour: Color3.fromHSV(hue, 1, 1),
                });
            }
        });
    }

    protected willUnmount(): void {
        this.running = false;
        if (this.connection) {
            this.connection.Disconnect();
        }
    }

    render() {
        return (
            <textlabel
                Text={this.props.text}
                TextScaled={true}
                Position={new UDim2(0.3, 0, 0.1, 0)}
                Size={new UDim2(0.4, 0, 0.15, 0)}
                BackgroundTransparency={0}
                BackgroundColor3={this.state.colour}
            />
        );
    }
}

