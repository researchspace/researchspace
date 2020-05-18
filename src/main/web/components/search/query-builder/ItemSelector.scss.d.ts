declare namespace ItemSelectorScssNamespace {
  export interface IItemSelectorScss {
    active: string;
    badge: string;
    disabled: string;
    dropdown: string;
    'dropdown-toggle': string;
    dropdownToggle: string;
    focus: string;
    itemHolder: string;
    itemSelector: string;
    open: string;
  }
}

declare const ItemSelectorScssModule: ItemSelectorScssNamespace.IItemSelectorScss;

export = ItemSelectorScssModule;
