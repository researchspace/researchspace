declare namespace AnnotationSidebarScssNamespace {
  export interface IAnnotationSidebarScss {
    annotation: string;
    annotationList: string;
    component: string;
    customTabContent: string;
    focused: string;
    topNav: string;
    highlighted: string;
    newAnnotationPlaceholder: string;
    tabHeader: string;
    tabIcon: string;
  }
}

declare const AnnotationSidebarScssModule: AnnotationSidebarScssNamespace.IAnnotationSidebarScss;

export = AnnotationSidebarScssModule;
