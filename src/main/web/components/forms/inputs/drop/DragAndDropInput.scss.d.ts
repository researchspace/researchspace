declare namespace DragAndDropInputScssNamespace {
  export interface IDragAndDropInputScss {
    holder: string;
    itemArea: string;
    'itemArea--no-header': string;
    itemAreaNoHeader: string;
    placeholderCard: string;
    placeholderContainer: string;
  }
}

declare const DragAndDropInputScssModule: DragAndDropInputScssNamespace.IDragAndDropInputScss;

export = DragAndDropInputScssModule;
