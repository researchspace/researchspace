declare namespace ReorderableListScssModule {
  export interface IReorderableListScss {
    component: string;
    'drag-by-handle': string;
    'drag-whole': string;
    dragByHandle: string;
    dragWhole: string;
    dragging: string;
    item: string;
    'item-body': string;
    'item-handle': string;
    itemBody: string;
    itemHandle: string;
  }
}

declare const ReorderableListScssModule: ReorderableListScssModule.IReorderableListScss;

export = ReorderableListScssModule;
