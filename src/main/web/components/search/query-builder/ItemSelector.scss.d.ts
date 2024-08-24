declare namespace ItemSelectorScssNamespace {
  export interface IItemSelectorScss {
    dropdown: string;
    itemHolder: string;
    itemSelector: string;
    "itemSelector--active": string;
    "itemSelector--dropdown-toggle": string;
    "itemSelector--focus": string;
    itemSelectorActive: string;
    itemSelectorDropdownToggle: string;
    itemSelectorFocus: string;
  }
}

declare const ItemSelectorScssModule: ItemSelectorScssNamespace.IItemSelectorScss;

export = ItemSelectorScssModule;
