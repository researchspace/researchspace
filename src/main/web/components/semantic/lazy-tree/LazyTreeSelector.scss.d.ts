declare namespace LazyTreeSelectorScssModule {
  export interface ILazyTreeSelectorScss {
    component: string;
    expandToggle: string;
    item: string;
    itemCollapsed: string;
    itemContent: string;
    itemExpanded: string;
    spinner: string;
    virtualizedList: string;
  }
}

declare const LazyTreeSelectorScssModule: LazyTreeSelectorScssModule.ILazyTreeSelectorScss;

export = LazyTreeSelectorScssModule;
