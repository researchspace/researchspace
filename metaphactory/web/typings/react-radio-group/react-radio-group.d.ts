declare module 'react-radio-group' {
  import * as React from 'react';

  type SelectedValue = string | number | boolean;
  interface RadioGroupProps extends React.Props<RadioGroupClass> {
    name: string;
    selectedValue?: SelectedValue
    onChange?: (selected: SelectedValue) => void
  }
  interface RadioGroup extends React.ReactElement<RadioGroupProps> {}
  interface RadioGroupClass extends React.ComponentClass<RadioGroupProps> {}
  export const RadioGroup: RadioGroupClass;

  interface RadioProps extends React.Props<RadioClass> {
    className?: string;
    title?: string;
    value?: number;
  }
  interface Radio extends React.ReactElement<RadioProps> {}
  interface RadioClass extends React.ComponentClass<RadioProps> {}
  export const Radio: RadioClass;
}
