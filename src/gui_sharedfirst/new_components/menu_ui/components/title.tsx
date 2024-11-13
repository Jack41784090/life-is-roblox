import * as React from 'react';
import { CONDOR_BLOOD_RED } from 'shared/const';

interface MenuFrameElementProps {
    title: string
}

export function MainMenuTitle({ title }: MenuFrameElementProps) {
    return (
        <textlabel Text={title}
            TextScaled={true} TextColor3={Color3.fromRGB(255, 255, 255)} Size={UDim2.fromScale(0.75, 0.25)}
            AnchorPoint={new Vector2(0.5, 0.5)} Position={UDim2.fromScale(0.5, 0.15)}
            BackgroundTransparency={.8}
            BackgroundColor3={Color3.fromRGB(0, 0, 0)}
            Font={Enum.Font.Garamond}
        >
            <uicorner CornerRadius={new UDim(0, 8)} />
            <uistroke Color={CONDOR_BLOOD_RED} Thickness={3} />
        </textlabel>
    );
}

export default MainMenuTitle;