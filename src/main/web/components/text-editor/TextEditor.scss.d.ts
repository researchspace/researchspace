declare namespace TextEditorScssNamespace {
  export interface ITextEditorScss {
    active: string;
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

declare const TextEditorScssModule: TextEditorScssNamespace.ITextEditorScss;

export = TextEditorScssModule;
