/// <reference path='../chartjs/chart.d.ts' />

declare module "react-chartjs-2" {
    import { Chart, ChartData, ChartOptions } from 'chart.js';
    import * as React from 'react';

    export type ChartType = 'doughnut' | 'pie' | 'line' | 'bar' | 'horizontalBar' | 'radar' | 'polarArea';

    interface ChartProps {
        data: ChartData;
        type?: ChartType;
        options?: ChartOptions;
        legend?: any;
        width: number;
        height?: number;
        onElementsClick?: (elements: any[]) => void;
        redraw?: boolean;
    }

    export default class ChartComponent<Data, Options> extends React.Component<ChartProps, any> {
      chart_instance: Chart;
    }

    interface ReactChart {
      chart_instance: Chart;
    }

    export class Line extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Bar extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class HorizontalBar extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Radar extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Polar extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Pie extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Doughnut extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
    export class Bubble extends React.Component<ChartProps, any> implements ReactChart {
      chart_instance: Chart;
    }
}
