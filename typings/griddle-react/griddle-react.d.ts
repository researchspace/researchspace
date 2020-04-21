///<reference types="react" />

declare module "griddle-react" {
  namespace Griddle {
    interface GriddleComponent extends React.ComponentClass<GriddleConfig> {
      getSortObject: () => {
        sortDirection : 'asc' | 'desc' | null | undefined;
      };
    }

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

      useCustomFilterer?: boolean;
      customFilterer?: (items: any[], query: string) => any[];
    }

    interface ColumnMetadata {
      displayName: string;
      columnName: string;
      visible?: boolean;
      order?: number;
      customComponent?: ComponentClass<any>;
      customCompareFn?:
        ((item: any) => number) |
        ((item1: any, item2: any) => number);
    }
  }

  const Griddle: Griddle.GriddleComponent;
  export = Griddle;
}
