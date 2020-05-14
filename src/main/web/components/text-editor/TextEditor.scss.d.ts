declare namespace TextEditorScssModule {
  export interface ITextEditorScss {
    draggableGripper: string;
    dropdownMenuItem: string;
    dropdownMenuItemIcon: string;
    editorContainer: string;
    externalLink: string;
    externalLinkHolder: string;
    internalLink: string;
    linkPopover: string;
    narrativeHolder: string;
    resourceBlock: string;
    resourceBlockActive: string;
    sidebar: string;
    sidebarAndEditorHolder: string;
    sidebarContainer: string;
    sidebarDropdown: string;
    titleHolder: string;
    titleInput: string;
    toolbar: string;
  }
}

declare const TextEditorScssModule: TextEditorScssModule.ITextEditorScss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: TextEditorScssModule.ITextEditorScss;
};

export = TextEditorScssModule;
