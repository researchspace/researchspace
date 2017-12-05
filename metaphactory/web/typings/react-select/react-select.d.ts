///<reference types='react' />

declare module ReactSelect {
  type Option = any;

  type Options = Option[];

  export interface Props {
    filterOptions?: (options: Options, filter: string, currentValues: Options) => Options
    autofocus?: boolean
    value: Option
    name?: string
    className?: string
    style?: React.CSSProperties
    multi?: boolean
    clearable?: boolean
    allowCreate?: boolean
    autoload?: boolean
    clearAllText?: string
    clearValueText?: string
    delimiter?: string
    disabled?: boolean
    ignoreCase?: boolean
    matchPos?: string
    onCloseResetsInput?: boolean;
    onInputChange?: (value: string) => void
    onInputKeyDown?: (event: any) => void
    matchProp?: string
    isLoading?: boolean
    noResultsText?: React.ReactElement<any> | string
    placeholder?: React.ReactElement<any> | string
    optionRenderer?: (value: any) => React.ReactElement<any> | string;
    valueRenderer?: (value: any) => React.ReactElement<any> | string;
    simpleValue?: boolean // pass the value to onChange as a simple value (legacy pre 1.0 mode), defaults to false
    onChange: (value: Options|Option) => void
    labelKey?: string
    valueKey?: string
    'data-datatype'?: string
    openOnFocus?: boolean
  }

  interface SyncProps extends Props, React.Props<Component> {
    options?: Options;
  }

  interface AsyncProps extends Props, React.Props<Async> {
    autoload?: boolean;
    loadOptions?: (query: string, cb: (result: any) => void) => void;
    cache?: boolean;
  }

  interface Component extends React.ComponentClass<SyncProps> {
    Async: Async;
    focus();
    closeMenu();
  }

  interface Async extends React.ComponentClass<AsyncProps> {
    focus();
  }
}

declare module 'react-select' {
  const ReactSelectComponent: ReactSelect.Component;
  export = ReactSelectComponent;
}
