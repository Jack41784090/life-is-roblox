import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';

interface Props {
    progress: React.Binding<number>;
}

export function Bar({ progress }: Props) {
    return (
        <frame
            Size={UDim2.fromScale(0.75, 0.025)}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.5, 0.85)}
            BackgroundTransparency={.8}
            BackgroundColor3={BrickColor.DarkGray().Color}
        >
            <uistroke Thickness={.75} Color={Color3.fromRGB(255, 255, 255)} />
            <uicorner CornerRadius={new UDim(0.5, 0)} />
            <frame
                Size={progress.map(v => UDim2.fromScale(v, 1))}
                BackgroundColor3={CONDOR_BLOOD_RED}
            >
                <uistroke Thickness={1} Color={CONDOR_BLOOD_RED} />
                <uicorner CornerRadius={new UDim(0.5, 0)} />
            </frame>
        </frame>
    );
}

export default Bar;