///<reference types="react" />

declare module "griddle-react" {
  namespace Griddle {
    interface GriddleComponent extends React.ComponentClass<GriddleConfig> {}

    interface GriddleConfig {
      tableClassName?: string;

      results?: ReadonlyArray<any>;
      resultsPerPage?: number;
      showFilter?: boolean;
      useGriddleStyles?: boolean;
      sortAscendingComponent?: React.ReactElement<any>;
      sortDescendingComponent?: React.ReactElement<any>;
      useCustomPagerComponent?: boolean;
      customPagerComponent?: React.ComponentClass<any>;
      customPagerComponentOptions?: {};

      columns?: ReadonlyArray<string>;
      columnMetadata?: ReadonlyArray<ColumnMetadata>;

      useCustomRowComponent?: boolean;
      customRowComponentClassName?: string;
      customRowComponent?: React.ComponentClass<any>;
      metadataColumns?: ReadonlyArray<any>;
    }

    interface ColumnMetadata {
      displayName: string;
      columnName: string;
      visible: boolean;
      order: number;
      customComponent: ComponentClass<any>;
    }
  }

  const Griddle: Griddle.GriddleComponent;
  export = Griddle;
}
