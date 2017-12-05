//// <reference type="react" />

declare module ReactSliderModule {
    interface ReactSliderComponentProps {
      allowCross: boolean,
      range: boolean,
      min: number,
      max: number,
      value: number[],
      defaultValue?: number[],
      handle?: any,
      onChange: Function
      className?: string
    }

    interface ReactSliderComponentClass extends React.ComponentClass<ReactSliderComponentProps> { }

    interface ReactSliderComponent extends React.Component<ReactSliderComponentProps, {}> { }
}

declare module 'rc-slider' {
    const ReactSliderComponent: ReactSliderModule.ReactSliderComponentClass;
    export = ReactSliderComponent;
}
