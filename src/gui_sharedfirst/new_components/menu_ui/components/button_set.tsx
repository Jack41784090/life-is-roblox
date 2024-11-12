import * as React from 'react';
import MainMenuButton, { Props as ButtonProps } from './button';

interface Props {
    buttons: Array<ButtonProps>;
}

interface State {
    testState: string;
}

export function MainMenuButtonSet({ buttons }: Props) {
    return (
        <frame
            Size={UDim2.fromScale(0.5, 0.35)}
            AnchorPoint={new Vector2(0.5, 0.5)}
            Position={UDim2.fromScale(0.25, 0.65)}
            BackgroundTransparency={1}
            BackgroundColor3={Color3.fromRGB(0, 0, 0)}
        >
            {buttons.map((button, index) => <MainMenuButton key={index} {...button} />)}
            <uilistlayout
                FillDirection={Enum.FillDirection.Vertical}
                HorizontalAlignment={Enum.HorizontalAlignment.Center}
                VerticalAlignment={Enum.VerticalAlignment.Center}
                Padding={new UDim(0.15, 0)}
            />
        </frame>
    );
}

export default MainMenuButtonSet;