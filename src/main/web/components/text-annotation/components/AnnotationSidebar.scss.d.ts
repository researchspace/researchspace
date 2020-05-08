declare namespace AnnotationSidebarScssModule {
  export interface IAnnotationSidebarScss {
    annotation: string;
    annotationList: string;
    component: string;
    focused: string;
    highlighted: string;
    newAnnotationPlaceholder: string;
    tabHeader: string;
    tabIcon: string;
  }
}

declare const AnnotationSidebarScssModule: AnnotationSidebarScssModule.IAnnotationSidebarScss;

export = AnnotationSidebarScssModule;
