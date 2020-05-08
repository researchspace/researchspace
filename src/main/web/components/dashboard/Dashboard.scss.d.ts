declare namespace DashboardScssModule {
  export interface IDashboardScss {
    addItemButton: string;
    defaultColumnItem: string;
    defaultComponent: string;
    defaultDashboard: string;
    deleteItemButton: string;
    dropAreaChildren: string;
    emptyPageDescription: string;
    emptyPageDrop: string;
    emptyPageDropArea: string;
    emptyPageLabel: string;
    emptyPageTitle: string;
    expandItemButton: string;
    icon: string;
    iconComponent: string;
    image: string;
    imageComponent: string;
    itemIcon: string;
    itemImage: string;
    itemLabel: string;
    itemLabelActive: string;
    itemLabelContainer: string;
    itemsContainer: string;
    itemsList: string;
    notOpacity: string;
    template: string;
    viewContainer: string;
  }
}

declare const DashboardScssModule: DashboardScssModule.IDashboardScss;

export = DashboardScssModule;
