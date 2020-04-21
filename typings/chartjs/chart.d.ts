
declare module "chart.js" {
  class Chart {
    constructor(ctx: CanvasRenderingContext2D, params: ChartParameters);
    /**
     * Use this to destroy any chart instances that are created.
     * This will clean up any references stored to the chart object within
     * Chart.js, along with any associated event listeners attached by Chart.js.
     * This must be called before the canvas is reused for a new chart.
     */
    destroy(): void;
    /**
     * Triggers an update of the chart. This can be safely called after
     * replacing the entire data object. This will update all scales, legends,
     * and then re-render the chart.
     */
    update(duration?: number, lazy?: boolean): void;
    /**
     * Triggers a redraw of all chart elements.
     * Note, this does not update elements for new data. Use .update() in that case.
     */
    render(duration: number, lazy: boolean): void;
    /**
     * Use this to stop any current animation loop.
     * This will pause the chart during any current animation frame.
     * Call .render() to re-animate.
     */
    stop(): void;
    /**
     * Use this to manually resize the canvas element. This is run each time
     * the canvas container is resized, but you can call this method manually
     * if you change the size of the canvas nodes container element.
     */
    resize(): void;
    /**
     * Will clear the chart canvas. Used extensively internally between
     * animation frames, but you might find it useful.
     */
    clear(): void;
    /** This returns a base 64 encoded string of the chart in it's current state. */
    toBase64Image(): string;
    /**
     * Returns an HTML string of a legend for that chart.
     * The legend is generated from the legendCallback in the options.
     */
    generateLegend(): string;
    /**
     * Calling getElementAtEvent(event) on your Chart instance passing
     * an argument of an event, or jQuery event, will return the single element
     * at the event position. If there are multiple items within range, only
     * the first is returned.
     */
    getElementAtEvent(e: Event): any;
    /**
     * Looks for the element under the event point, then returns all elements
     * at the same data index. This is used internally for 'label' mode highlighting.
     */
    getElementsAtEvent(e: Event): any[];
    /**
     * Looks for the element under the event point, then returns all elements
     * from that dataset. This is used internally for 'dataset' mode highlighting.
     */
    getDatasetAtEvent(e: Event): DataSet;
    /**
     * Looks for the dataset that matches the current index and returns that metadata.
     * This returned data has all of the metadata that is used to construct the chart.
     */
    getDatasetMeta(index: number): any;

    static defaults: {
      global: ChartOptions & GlobalFontOptions;
      bar: ChartOptions;
      bubble: ChartOptions;
      doughnut: ChartOptions;
      line: ChartOptions;
      polarArea: ChartOptions;
      radar: ChartOptions;
    };

    static scaleService: {
      updateScaleDefaults(scaleType: string, configuration: ScaleOptions): void;
      registerScaleType(scaleType: string, constructor: { new(): AxisScale }, defaultConfigObject: ScaleOptions);
    }
  }

  interface ChartParameters {
    type: 'line' | 'bar' | 'radar' | 'polarArea' | 'pie' | 'doughnut' | 'bubble';
    data: ChartData;
    options: ChartOptions;
  }

  type DataSet = LinearDataSet | BarDataSet | CircularDataSet | CircularDataSet;

  type Color = string | CanvasGradient | CanvasPattern;
  /** When providing data for the time scale, Chart.js supports all of the formats that Moment.js accepts. */
  type Time = any;

  interface ChartData {
    /**
     * Contains data for each dataset. See the documentation for each chart
     * type to determine the valid options that can be attached to the dataset.
     */
    datasets: DataSet[];
    /** Optional parameter that is used with the category axis. */
    labels?: Array<string | string[]>;
    /**
     * Optional parameter that is used with the category axis and is used if
     * the axis is horizontal.
     */
    xLabels?: string[];
    /**
     * Optional parameter that is used with the category axis and is used if
     * the axis is vertical.
     */
    yLabels?: string[];
  }

  interface GlobalFontOptions {
    /** Default font color for all text. */
    defaultFontColor?: Color;
    /** Default font family for all text. */
    defaultFontFamily?: string;
    /** Default font size (in px) for text. Does not apply to radialLinear scale point labels. */
    defaultFontSize?: number;
    /** Default font style. Does not apply to tooltip title or footer. Does not apply to chart title. */
    defaultFontStyle?: string;
  }

  interface ChartOptions {
    title?: TitleOptions;
    legend?: LegendOptions;
    tooltips?: TooltipOptions;
    hover?: HoverOptions;
    animation?: AnimationOptions;
    elements?: ElementOptions;
    scales?: {
      xAxes?: ScaleOptions[];
      yAxes?: ScaleOptions[];
    }
    defaultColor?: Color;

    /** Resizes when the canvas container does. */
    responsive?: boolean;
    /** Duration in milliseconds it takes to animate to new size after a resize event. */
    responsiveAnimationDuration?: number;
    /** Maintain the original canvas aspect ratio (width / height) when resizing. */
    maintainAspectRatio?: boolean;
    /** Events that the chart should listen to for tooltips and hovering. */
    events?: string[];
    /** Called if the event is of type 'mouseup' or 'click'. */
    onClick?: (this: Chart, e: MouseEvent, activeElements: any[]) => void;
    /** Function to generate a legend. */
    legendCallback?: (chart: Chart) => string;
    /** Called when a resize occurs. */
    onResize?: (chart: Chart, newSize: any) => void;

    // line chart
    /** If false, the lines between points are not drawn. */
    showLines?: boolean;
    /** If true, NaN data does not break the line. */
    spanGaps?: boolean;

    // pie and doughnut charts
    /** The percentage of the chart that is cut out of the middle. */
    cutoutPercentage?: number;
    /** Starting angle to draw arcs from. */
    rotation?: number;
    /** Sweep to allow arcs to cover. */
    circumference?: number;

    // radar chart
    /** Options for the one scale used on the chart. Use this to style the ticks, labels, and grid lines. */
    scale?: ScaleOptions;
  }

  interface TitleOptions {
    /** Display the title block. */
    display?: boolean;
    /** Position of the title. Only 'top' or 'bottom' are currently allowed. */
    position?: 'top' | 'bottom';
    /**
     * Marks that this box should take the full width of the canvas (pushing
     * down other boxes).
     */
    fullWidth?: boolean;
    /** Font size inherited from global configuration. */
    fontSize?: number;
    /** Font family inherited from global configuration. */
    fontFamily?: string;
    /** Font color inherited from global configuration. */
    fontColor?: Color;
    /** Font styling of the title. */
    fontStyle?: string;
    /** Number of pixels to add above and below the title text. */
    padding?: number;
    /** Title text. */
    text?: string;
  }

  interface LegendOptions {
    /** Is the legend displayed. */
    display?: boolean;
    /** Position of the legend. Options are 'top' or 'bottom'. */
    position?: 'top' | 'bottom';
    /**
     * Marks that this box should take the full width of the canvas (pushing
     * down other boxes).
     */
    fullWidth?: boolean;
    /**
     * A callback that is called when a click is registered on top of a label
     * item.
     */
    onClick?: (event: any, legengItem: LegendItem) => void;
    labels?: LegendLabelOptions;
  }

  interface LegendLabelOptions {
    /** Width of coloured box. */
    boxWidth?: number;
    /** Font size inherited from global configuration. */
    fontSize?: number;
    /** Font style inherited from global configuration. */
    fontStyle?: string;
    /** Font color inherited from global configuration. */
    fontColor?: Color;
    /** Font family inherited from global configuration. */
    fontFamily?: string;
    /** Padding between rows of colored boxes. */
    padding?: number;
    /**
     * Generates legend items for each thing in the legend. Default
     * implementation returns the text + styling for the color box.
     * See Legend Item for details.
     */
    generateLabels?: (chart: Chart) => LegendItem[];
    /**
     * Label style will match corresponding point style (size is based on
     * fontSize, boxWidth is not used in this case).
     */
    usePointStyle?: boolean;
  }

  /**
   * Items passed to the legend onClick function are the ones returned from
   * labels.generateLabels. These items must implement the following interface.
   */
  interface LegendItem {
    /** Label that will be displayed. */
    text?: string;
    /** Fill style of the legend box. */
    fillStyle?: Color;
    /**
     * If true, this item represents a hidden dataset. Label will be rendered
     * with a strike-through effect.
     */
    hidden?: boolean;
    /**
     * For box border. See https://developer.mozilla.org/en/docs/Web/API/CanvasRenderingContext2D/lineCap
     */
    lineCap?: string;
    /**
     * For box border. See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setLineDash
     */
    lineDash?: number[];
    /**
     * For box border. See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineDashOffset
     */
    lineDashOffset?: number;
    /**
     * For box border. See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin
     */
    lineJoin?: string;
    /** Width of box border. */
    lineWidth?: number;
    /** Stroke style of the legend box. */
    strokeStyle?: Color;
    /** Point style of the legend box (only used if usePointStyle is true). */
    pointStyle?: string;
  }

  interface TooltipOptions {
    /** Are tooltips enabled. */
    enabled?: boolean;
    custom?: (tooltip: TooltipModel) => void;
    /** Sets which elements appear in the tooltip. */
    mode?: 'single' | 'label' | 'x-axis' | 'index';
    /**
     * If true, the tooltip mode applies only when the mouse position
     * intersects with an element. If false, the mode will be applied at all
     * times.
     */
    intersect?: boolean;
    /** The mode for positioning the tooltip. */
    position?: 'average' | 'nearest';
    /**
     * Allows sorting of tooltip items. Must implement a function that can be
     * passed to Array.prototype.sort.
     */
    itemSort?: (a: any, b: any) => number;
    /** Background color of the tooltip. */
    backgroundColor?: Color;
    /** Font family for tooltip title inherited from global font family. */
    titleFontFamily?: string;
    /** Font size for tooltip title inherited from global font size. */
    titleFontSize?: number;
    titleFontStyle?: string;
    /** Font color for tooltip title. */
    titleFontColor?: Color;
    /** Spacing to add to top and bottom of each title line. */
    titleSpacing?: number;
    /** Margin to add on bottom of title section. */
    titleMarginBottom?: number;
    /** Font family for tooltip items inherited from global font family. */
    bodyFontFamily?: string;
    /** Font size for tooltip items inherited from global font size. */
    bodyFontSize?: number;
    bodyFontStyle?: string;
    /** Font color for tooltip items. */
    bodyFontColor?: string;
    /** Spacing to add to top and bottom of each tooltip item. */
    bodySpacing?: number;
    /** Font family for tooltip footer inherited from global font family. */
    footerFontFamily?: string;
    /** Font size for tooltip footer inherited from global font size. */
    footerFontSize?: number;
    /** Font style for tooltip footer. */
    footerFontStyle?: string;
    /** Font color for tooltip footer. */
    footerFontColor?: Color;
    /** Spacing to add to top and bottom of each footer line. */
    footerSpacing?: number;
    /** Margin to add before drawing the footer. */
    footerMarginTop?: number;
    /** Padding to add on left and right of tooltip. */
    xPadding?: number;
    /** Padding to add on top and bottom of tooltip. */
    yPadding?: number;
    /** Size, in px, of the tooltip arrow. */
    caretSize?: number;
    /** Radius of tooltip corner curves. */
    cornerRadius?: number;
    /**
     * Color to draw behind the colored boxes when multiple items are in the
     * tooltip.
     */
    multiKeyBackground?: string;
    callbacks?: TooltipCallbacks;
  }

  /**
   * The tooltip label configuration is nested below the tooltip configuration
   * using the callbacks key. The tooltip has the following callbacks for
   * providing text. For all functions, 'this' will be the tooltip object
   * created from the Chart.Tooltip constructor.
   *
   * All functions are called with the same arguments: a tooltip item and the
   * data object passed to the chart. All functions must return either a string
   * or an array of strings. Arrays of strings are treated as multiple lines of
   * text.
   */
  interface TooltipCallbacks {
    /** Text to render before the title. */
    beforeTitle?: (this: Chart.Tooltip, items: TooltipItem[], data: ChartData) => string | string[];
    /** Text to render as the title. */
    title?: (this: Chart.Tooltip, items: TooltipItem[], data: ChartData) => string | string[];
    /** Text to render after the title. */
    afterTitle?: (this: Chart.Tooltip, items: TooltipItem[], data: ChartData) => string | string[];
    /** Text to render before the body section. */
    beforeBody?: (this: Chart.Tooltip, items: TooltipItem[], data: ChartData) => string | string[];
    /** Text to render before an individual label. */
    beforeLabel?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
    /** Text to render for an individual item in the tooltip. */
    label?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
    /** Returns the colors to render for the tooltip item. */
    labelColor?: (this: Chart.Tooltip, item: TooltipItem, instance: Chart) => {
      borderColor: Color;
      backgroundColor: Color;
    };
    /** Text to render after an individual label. */
    afterLabel?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
    /** Text to render after the body section. */
    afterBody?: (this: Chart.Tooltip, items: TooltipItem[], data: ChartData) => string | string[];
    /** Text to render before the footer section. */
    beforeFooter?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
    /** Text to render as the footer. */
    footer?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
    /** Text to render after the footer section. */
    afterFooter?: (this: Chart.Tooltip, item: TooltipItem, data: ChartData) => string | string[];
  }

  /** The tooltip model contains parameters that can be used to render the tooltip. */
  interface TooltipModel {
    // The items that we are rendering in the tooltip. See Tooltip Item Interface section
    dataPoints: TooltipItem[];

    // Positioning
    xPadding: number;
    yPadding: number;
    xAlign: string;
    yAlign: string;

    // X and Y properties are the top left of the tooltip
    x: number;
    y: number;
    width: number;
    height: number;
    // Where the tooltip points to
    caretX: number;
    caretY: number;

    // Body
    // The body lines that need to be rendered
    body: Array<{
      /** lines of text before the line with the color square */
      before: string[];
      /** lines of text to render as the main item with color square */
      lines: string[];
      /** lines of text to render after the main lines */
      after: string[];
    }>,
    // lines of text that appear after the title but before the body
    beforeBody: string[];
    // line of text that appear after the body and before the footer
    afterBody: string[];
    bodyFontColor: Color;
    _bodyFontFamily: string;
    _bodyFontStyle: string;
    _bodyAlign: string;
    bodyFontSize: number;
    bodySpacing: number;

    // Title
    // lines of text that form the title
    title: string[];
    titleFontColor: Color;
    _titleFontFamily: string;
    _titleFontStyle: string;
    titleFontSize: number;
    _titleAlign: string;
    titleSpacing: number;
    titleMarginBottom: number;

    // Footer
    // lines of text that form the footer
    footer: string[];
    footerFontColor: Color;
    _footerFontFamily: string;
    _footerFontStyle: string;
    footerFontSize: number;
    _footerAlign: string;
    footerSpacing: number;
    footerMarginTop: number;

    // Appearance
    caretSize: number;
    cornerRadius: number;
    backgroundColor: color;

    // colors to render for each item in body[]. This is the color of the squares in the tooltip
    labelColors: Color[];

    // 0 opacity is a hidden tooltip
    opacity: number;
    legendColorBackground: Color;
    displayColors: boolean;
  }

  /** The tooltip items passed to the tooltip callbacks implement the following interface. */
  interface TooltipItem {
    /** X Value of the tooltip as a string. */
    xLabel: string;
    /** Y value of the tooltip as a string. */
    yLabel: string;
    /** Index of the dataset the item comes from. */
    datasetIndex: number;
    /** Index of this data item in the dataset. */
    index: number;
  }

  interface HoverOptions {
    /** Sets which elements hover. */
    mode?: 'single' | 'label' | 'x-axis' | 'dataset';
    /** Duration in milliseconds it takes to animate hover style changes. */
    animationDuration?: number;
    /**
     * Called when any of the events fire. Called in the context of the chart
     * and passed an array of active elements (bars, points, etc).
     */
    onHover?: (this: Chart, elements: any[]) => void;
  }

  interface AnimationOptions {
    /** The number of milliseconds an animation takes. */
    duration?: number;
    /** Easing function to use. */
    easing?: string;
    /**
     * Callback called on each step of an animation. Passed a single argument,
     * an object, containing the chart instance and an object with details of
     * the animation.
     */
    onProgress?: (param: AnimationCallbackParam) => void;
    /**
     * Callback called at the end of an animation. Passed the same arguments as
     * onProgress.
     */
    onComplete?: (param: AnimationCallbackParam) => void;

    // pie and doughnut charts
    /** If true, will animate the rotation of the chart. */
    animateRotate?: boolean;
    /** If true, will animate scaling the Doughnut from the centre. */
    animateScale?: boolean;
  }

  interface AnimationCallbackParam {
    /** Chart object. */
    chartInstance: Chart;
    /** Contains details of the on-going animation. */
    animationObject: Chart.Animation;
  }

  interface ElementOptions {
    /** Arcs are used in the polar area, doughnut and pie charts. */
    arc?: ArcOptions;
    /** Line elements are used to represent the line in a line chart. */
    line?: LineOptions;
    /**
     * Point elements are used to represent the points in a line chart or a
     * bubble chart.
     */
    point?: PointOptions;
    /** Rectangle elements are used to represent the bars in a bar chart. */
    rectangle?: RectangleOptions;
  }

  interface ArcOptions {
    /** Default fill color for arcs. Inherited from the global default. */
    backgroundColor?: Color;
    /** Default stroke color for arcs. */
    borderColor?: Color;
    /** Default stroke width for arcs. */
    borderWidth?: number;
  }

  interface LineOptions {
    /** Default bezier curve tension. Set to 0 for no bezier curves. */
    tension?: number;
    /** Default line fill color. */
    backgroundColor?: Color;
    /** Default line stroke width. */
    borderWidth?: string;
    /** Default line stroke color. */
    borderColor?: Color;
    /** Default line cap style. */
    borderCapStyle?: string;
    /** Default line dash. */
    borderDash?: number[];
    /** Default line dash offset. */
    borderDashOffset?: number;
    /** Default line join style. */
    borderJoinStyle?: string;
    /**
     * If true, bezier control points are kept inside the chart.
     * If false, norestriction is enforced.
     */
    capBezierPoints?: boolean;
    /** If true, the line is filled. */
    fill?: boolean;
    /**
     * If true, the line is shown as a steeped line and 'tension' will be
     * ignored.
     */
    stepped?: boolean;
  }

  interface PointOptions {
    /** Default point radius. */
    radius?: number;
    /** Default point style. */
    pointStyle?: string;
    /** Default point fill color. */
    backgroundColor?: Color;
    /** Default point stroke width. */
    borderWidth?: number;
    /** Default point stroke color. */
    borderColor?: Color;
    /** Extra radius added to point radius for hit detection. */
    hitRadius?: number;
    /** Default point radius when hovered. */
    hoverRadius?: number;
    /** Default stroke width when hovered. */
    hoverBorderWidth?: number;
  }

  interface RectangleOptions {
    /** Default bar fill color. */
    backgroundColor?: Color;
    /** Default bar stroke width. */
    borderWidth?: number;
    /** Default bar stroke color. */
    borderColor?: Color;
    /** Default skipped (excluded) border for rectangle. */
    borderSkipped?: RectangleBorder;
  }

  type RectangleBorder = 'bottom' | 'left' | 'top' | 'right';

  interface ScaleOptions {
    /** Type of scale being employed. Custom scales can be created and registered with a string key.  */
    type?: string;
    /**
     * If true, show the scale including gridlines, ticks, and labels.
     * Overrides gridLines.display, scaleLabel.display, and ticks.display.
     */
    display?: boolean;
    /** Position of the scale. */
    position?: RectangleBorder;
    /**
     * The ID is used to link datasets and scale axes together.
     * The properties datasets.xAxisID or datasets.yAxisID have to match the
     * scale properties scales.xAxes.id or scales.yAxes.id.
     * This is especially needed if multi-axes charts are used.
     */
    id?: string;
    /** Callback called before the update process starts. */
    beforeUpdate?: (scale: AxisScale) => void;
    /** Callback that runs before dimensions are set. */
    beforeSetDimensions?: (scale: AxisScale) => void;
    /** Callback that runs after dimensions are set. */
    afterSetDimensions?: (scale: AxisScale) => void;
    /** Callback that runs before data limits are determined. */
    beforeDataLimits?: (scale: AxisScale) => void;
    /** Callback that runs after data limits are determined. */
    afterDataLimits?: (scale: AxisScale) => void;
    /** Callback that runs before ticks are created. */
    beforeBuildTicks?: (scale: AxisScale) => void;
    /** Callback that runs after ticks are created. Useful for filtering ticks. */
    afterBuildTicks?: (scale: AxisScale) => void;
    /** Callback that runs before ticks are converted into strings. */
    beforeTickToLabelConversion?: (scale: AxisScale) => void;
    /** Callback that runs after ticks are converted into strings. */
    afterTickToLabelConversion?: (scale: AxisScale) => void;
    /** Callback that runs before tick rotation is determined. */
    beforeCalculateTickRotation?: (scale: AxisScale) => void;
    /** Callback that runs after tick rotation is determined. */
    afterCalculateTickRotation?: (scale: AxisScale) => void;
    /** Callback that runs before the scale fits to the canvas. */
    beforeFit?: (scale: AxisScale) => void;
    /** Callback that runs after the scale fits to the canvas. */
    afterFit?: (scale: AxisScale) => void;
    /** Callback that runs at the end of the update process. */
    afterUpdate?: (scale: AxisScale) => void;
    gridLines?: GridLineOptions;
    scaleLabel?: ScaleTitleOptions;
    ticks?: TickOptions;

    // time scale
    time?: TimeScaleOptions;

    // radial linear scale
    /**
     * If true, circular arcs are used else straight lines are used.
     * The former is used by the polar area chart and the latter by the radar chart.
     */
    lineArc?: boolean;
    /**
     * Configures angled lines that radiate from the center of the chart to the
     * point labels. They can be found in the angleLines sub options.
     * Note that these options only apply if lineArc is false.
     */
    angleLines?: RadialScaleAngleLineOptions;
    /**
     * Configures the point labels that are shown on the perimeter of the scale.
     * They can be found in the pointLabels sub options.
     * Note that these options only apply if lineArc is false.
     */
    pointLabels?: RadialScalePointLabelOptions;
  }

  /** Defines options for the grid lines that run perpendicular to the axis. */
  interface GridLineOptions {
    display?: boolean;
    /** Color of the grid lines. */
    color?: Color | Color[];
    /** Stroke width of grid lines. */
    lineWidth?: number | number[];
    /** If true draw border on the edge of the chart. */
    drawBorder?: boolean;
    /**
     * If true, draw lines on the chart area inside the axis lines.
     * This is useful when there are multiple axes and you need to control
     * which grid lines are drawn.
     */
    drawOnChartArea?: boolean;
    /** If true, draw lines beside the ticks in the axis area beside the chart. */
    drawTicks?: boolean;
    /** Length in pixels that the grid lines will draw into the axis area. */
    tickMarkLength?: number;
    /** Stroke width of the grid line for the first index (index 0). */
    zeroLineWidth?: number;
    /** Stroke color of the grid line for the first index (index 0). */
    zeroLineColor?: Color;
    /**
     * If true, labels are shifted to be between grid lines.
     * This is used in the bar chart.
     */
    offsetGridLines?: boolean;
  }

  /** Defines options for the scale title. */
  interface ScaleTitleOptions {
    display?: boolean;
    /** The text for the title. (i.e. "# of People", "Response Choices"). */
    labelString?: string;
    /** Font color for the scale title. */
    fontColor?: Color;
    /** Font family for the scale title, follows CSS font-family options. */
    fontFamily?: string;
    /** Font size for the scale title. */
    fontSize?: number;
    /**
     * Font style for the scale title, follows CSS font-style options
     * (i.e. normal, italic, oblique, initial, inherit).
     */
    fontStyle?: number;
  }

  /** Defines options for the tick marks that are generated by the axis. */
  interface TickOptions {
    /**
     * If true, automatically calculates how many labels that can be shown and
     * hides labels accordingly. Turn it off to show all labels no matter what.
     */
    autoSkip?: boolean;
    /**
     * Returns the string representation of the tick value as it should be
     * displayed on the chart.
     */
    callback?: (value: any, index: number, values: any[]) => string | null | undefined;
    /** If true, show the ticks. */
    display?: boolean;
    /** Font color for the tick labels. */
    fontColor?: Color;
    /** Font family for the tick labels, follows CSS font-family options. */
    fontFamily?: string;
    /** Font size for the tick labels. */
    fontSize?: number;
    /**
     * Font style for the tick labels, follows CSS font-style options
     * (i.e. normal, italic, oblique, initial, inherit).
     */
    fontStyle?: string;
    /**
     * Distance in pixels to offset the label from the centre point of the tick
     * (in the y direction for the x axis, and the x direction for the y axis).
     * Note: this can cause labels at the edges to be cropped by the edge of the canvas.
     */
    labelOffset?: number;
    /**
     * Maximum rotation for tick labels when rotating to condense labels.
     * Note: Rotation doesn't occur until necessary.
     * Note: Only applicable to horizontal scales.
     */
    maxRotation?: number;
    /**
     * Minimum rotation for tick labels.
     * Note: Only applicable to horizontal scales.
     */
    minRotation?: number;
    /**
     * Flips tick labels around axis, displaying the labels inside the chart
     * instead of outside.
     * Note: Only applicable to vertical scales.
     */
    mirror?: boolean;
    /**
     * Padding between the tick label and the axis.
     * Note: Only applicable to horizontal scales.
     */
    padding?: number;
    /** Reverses order of tick labels. */
    reverse?: boolean;

    // linear scale
    /** User defined minimum number for the scale, overrides minimum value from data. */
    min?: number | string;
    /** User defined maximum number for the scale, overrides maximum value from data. */
    max?: number | string;
    /** if true, scale will inclulde 0 if it is not already included. */
    beginAtZero?: boolean;
    /**
     * Maximum number of ticks and gridlines to show.
     * If not defined, it will limit to 11 ticks but will show all gridlines.
     */
    maxTicksLimit?: number;
    /**
     * User defined fixed step size for the scale. If set, the scale ticks will
     * be enumerated by multiple of stepSize, having one tick per increment.
     * If not set, the ticks are labeled automatically using the nice numbers algorithm.
     */
    fixedStepSize?: number;
    /** If defined, it can be used along with the min and the max to give a custom number of steps. */
    stepSize?: number;
    /**
     * User defined maximum number for the scale, overrides maximum value
     * except for if it is lower than the maximum value.
     */
    suggestedMax?: number;
    /**
     * User defined minimum number for the scale, overrides minimum value
     * except for if it is higher than the minimum value.
     */
    suggestedMin?: number;

    // radial linear scale
    /** Color of label backdrops. */
    backdropColor?: Color;
    /** Horizontal padding of label backdrop. */
    backdropPaddingX?: number;
    /** Vertical padding of label backdrop. */
    backdropPaddingY?: number;
    /** If true, draw a background behind the tick labels. */
    showLabelBackdrop?: boolean;
  }

  interface TimeScaleOptions {
    displayFormats?: TimeScaleDisplayFormats;
    /** If true and the unit is set to 'week', iso weekdays will be used. */
    isoWeekday?: boolean;
    /** If defined, this will override the data maximum. */
    max?: Time;
    /** If defined, this will override the data minimum. */
    min?: Time;
    /**
     * If defined as a string, it is interpreted as a custom format to be used
     * by moment to parse the date. If this is a function, it must return
     * a moment.js object given the appropriate data value.
     */
    parser?: string | ((time: Time) => any);
    /** If defined, dates will be rounded to the start of this unit. */
    round?: TimeUnit;
    /** The moment js format string to use for the tooltip. */
    tooltipFormat?: string;
    /** If defined, will force the unit to be a certain type. */
    unit?: TimeUnit;
    /** The number of units between grid lines. */
    unitStepSize?: number;
  }

  /**
   * Determines how different time units are formed into strings for the axis tick marks.
   */
  interface TimeScaleDisplayFormats {
    millisecond?: string;
    second?: string;
    minute?: string;
    hour?: string;
    day?: string;
    week?: string;
    month?: string;
    quarter?: string;
    year?: string;
  }

  interface RadialScaleAngleLineOptions {
    /** If true, angle lines are shown. */
    display?: boolean;
    /** Color of angled lines. */
    color?: Color;
    /** Width of angled lines. */
    lineWidth?: number;
  }

  interface RadialScalePointLabelOptions {
    /** Callback function to transform data label to axis label. */
    callback?: Function;
    /** Font color. */
    fontColor?: Color;
    /** Font family to render. */
    fontFamily?: string;
    /** Font size in pixels. */
    fontSize?: number;
    /** Font Style to use. */
    fontStyle?: string;
  }

  type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

  interface LinearDataSet {
    /** The data to plot in a line. */
    data: number[] | Array<{ x: number; y: number; }>;
    /** The label for the dataset which appears in the legend and tooltips. */
    label?: string;
    /** The ID of the x axis to plot this dataset on. */
    xAxisID?: string;
    /** The ID of the y axis to plot this dataset on. */
    yAxisID?: string;
    /** If true, fill the area under the line. */
    fill?: boolean;
    /**
     * Bezier curve tension of the line. Set to 0 to draw straightlines.
     * Note: This was renamed from 'tension' but the old name still works.
     */
    lineTension?: number;
    /** The fill color under the line. */
    backgroundColor?: Color;
    /** The width of the line in pixels. */
    borderWidth?: number;
    /** The color of the line. */
    borderColor?: Color;
    /** Cap style of the line. */
    borderCapStyle?: string;
    /** 	Length and spacing of dashes. */
    borderDash?: number[];
    /** Offset for line dashes. */
    borderDashOffset?: number;
    /** Line joint style. */
    borderJoinStyle?: string;
    /** The border color for points. */
    pointBorderColor?: Color | Color[];
    /** The fill color for points. */
    pointBackgroundColor?: Color | Color[];
    /** The width of the point border in pixels. */
    pointBorderWidth?: number | number[];
    /** The radius of the point shape. If set to 0, nothing is rendered. */
    pointRadius?: number | number[];
    /** The radius of the point when hovered. */
    pointHoverRadius?: number | number[];
    /** The pixel size of the non-displayed point that reacts to mouse events. */
    pointHitRadius?: number | number[];
    hitRadius?: number | number[];
    /** Point background color when hovered. */
    pointHoverBackgroundColor?: Color | Color[];
    /** Point border color when hovered. */
    pointHoverBorderColor?: Color | Color[];
    /** Border width of point when hovered. */
    pointHoverBorderWidth?: number | number[];
    /**
     * The style of point. If the option is an image, that image is drawn on
     * the canvas using drawImage.
     */
    pointStyle?: PointStyle | PointStyle[] | HTMLImageElement | HTMLImageElement[];
    /** If false, the line is not drawn for this dataset. */
    showLine?: boolean;
    /** If true, lines will be drawn between points with no or null data. */
    spanGaps?: boolean;
    /**
     * If true, the line is shown as a steeped line and 'lineTension' will be
     * ignored.
     */
    steppedLine?: boolean;
  }

  type PointStyle = 'circle' | 'triangle' | 'rect' | 'rectRot' | 'cross' | 'crossRot' | 'star' | 'line' | 'dash';

  interface BarDataSet {
    /** The data to plot as bars. */
    data: number[];
    /** The label for the dataset which appears in the legend and tooltips. */
    label?: string;
    /** The ID of the x axis to plot this dataset on. */
    xAxisID?: string;
    /** 	The ID of the y axis to plot this dataset on. */
    yAxisID?: string;
    /** The fill color of the bars. */
    backgroundColor?: Color | Color[];
    /** Bar border color. */
    borderColor?: Color | Color[];
    /** Border width of bar in pixels. */
    borderWidth?: number | number[];
    /** Which edge to skip drawing the border for. */
    borderSkipped?: RectangleBorder | RectangleBorder[];
    /** Bar background color when hovered. */
    hoverBackgroundColor?: Color | Color[];
    /** Bar border color when hovered. */
    hoverBorderColor?: Color | Color[];
    /** Border width of bar when hovered. */
    hoverBorderWidth?: number | number[];
  }

  interface CircularDataSet {
    /** The data to plot as arcs. */
    data: number[];
    /** The label for the dataset which appears in the legend and tooltips. */
    label?: string;
    /** The fill color of the arcs. */
    backgroundColor?: Color[];
    /** Arc border color. */
    borderColor?: Color[];
    /** Border width of arcs in pixels. */
    borderWidth?: number[];
    /** Arc background color when hovered. */
    hoverBackgroundColor?: Color[];
    /** Arc border color when hovered. */
    hoverBorderColor?: Color[];
    /** Border width of arc when hovered. */
    hoverBorderWidth?: number[];
  }

  interface BubbleDataSet {
    /** The data to plot as bubbles. */
    data: BubbleDataObject[];
    /** The label for the dataset which appears in the legend and tooltips. */
    label?: string;
    /** The fill color of the bubbles. */
    backgroundColor?: Color | Color[];
    /** The stroke color of the bubbles. */
    borderColor?: Color | Color[];
    /** The stroke width of bubble in pixels. */
    borderWidth?: number | number[];
    /** The fill color of the bubbles when hovered. */
    hoverBackgroundColor?: Color | Color[];
    /** The stroke color of the bubbles when hovered. */
    hoverBorderColor?: Color | Color[];
    /** The stroke width of the bubbles when hovered. */
    hoverBorderWidth?: number | number[];
    /** Additional radius to add to data radius on hover. */
    hoverRadius?: number | number[];
  }

  interface BubbleDataObject {
    /** X Value. */
    x: number;
    /** Y Value. */
    y: number;
    /** Radius of bubble. This is not scaled. */
    r: number;
  }

  interface SpecificChartParameters {
    data: ChartData;
    options: ChartOptions;
  }

  interface AxisScale extends Chart.Scale {}

  namespace Chart {
    function Line(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function Bar(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function Radar(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function PolarArea(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function Pie(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function Doughnut(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;
    function Bubble(ctx: CanvasRenderingContext2D, params: SpecificChartParameters): Chart;

    abstract class Tooltip implements TooltipModel {}

    abstract class Animation {
      /** Current Animation frame number. */
      currentStep: number;
      /** Number of animation frames. */
      numSteps: number;
      /** Animation easing to use. */
      easing: string;
      /** Function that renders the chart. */
      render: Function;
      /** User callback. */
      onAnimationProgress: Function;
      /** User callback. */
      onAnimationComplete: Function;
    }

    abstract class Scale implements RuntimeScale {
      /** Determines the data limits. Should set this.min and this.max to be the data max/min */
      abstract determineDataLimits(): void;
      /**
       * Generate tick marks. this.chart is the chart instance.
       * The data object can be accessed as this.chart.data.
       * buildTicks() should create a ticks array on the axis instance,
       * if you intend to use any of the implementations from the base class.
       */
      abstract buildTicks(): void;
      /**
       * Get the value to show for the data at the given index of the the given
       * dataset, ie this.chart.data.datasets[datasetIndex].data[index].
       */
      abstract getLabelForIndex(index: number, datasetIndex: number): any;
      /**
       * Get the pixel (x coordinate for horizontal axis, y coordinate for
       * vertical axis) for a given value.
       * @param index: index into the ticks array
       * @param includeOffset: if true, get the pixel halway between the given
       *  tick and the next
       */
      abstract getPixelForTick(index: number, includeOffset: boolean): any;
      /**
       * Get the pixel (x coordinate for horizontal axis, y coordinate for
       * vertical axis) for a given value.
       * @param value : the value to get the pixel for
       * @param index : index into the data array of the value
       * @param datasetIndex : index of the dataset the value comes from
       * @param includeOffset : if true, get the pixel halway between the given
       *  tick and the next
       */
      abstract getPixelForValue(value: any, index: number, datasetIndex: number, includeOffset: boolean): any;
      /**
       * Get the value for a given pixel (x coordinate for horizontal axis,
       * y coordinate for vertical axis).
       * @param pixel : pixel value
       */
      abstract getValueForPixel(pixel: any): any;
      /**
       * Transform the ticks array of the scale instance into strings.
       * The default implementation simply calls
       * this.options.ticks.callback(numericalTick, index, ticks);
       */
      convertTicksToLabels(): void;
      /**
       * Determine how much the labels will rotate by. The default
       * implementation will only rotate labels if the scale is horizontal.
       */
      calculateTickRotation(): void;
      /**
       * Fits the scale into the canvas.
       * this.maxWidth and this.maxHeight will tell you the maximum dimensions
       * the scale instance can be. Scales should endeavour to be as efficient
       * as possible with canvas space.
       * this.margins is the amount of space you have on either side of your
       * scale that you may expand in to. This is used already for calculating
       * the best label rotation.
       * You must set this.minSize to be the size of your scale. It must be an
       * object containing 2 properties: width and height.
       * You must set this.width to be the width and this.height to be the
       * height of the scale.
       */
      fit(): void;
      /**
       * Draws the scale onto the canvas. this.(left|right|top|bottom) will
       * have been populated to tell you the area on the canvas to draw in.
       * @param chartArea : This is the rectangle that lines, bars, etc will
       *  be drawn in. It may be used, for example, to draw grid lines.
       */
      draw(chartArea: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      }): void;
      /** Returns true if the scale instance is horizontal. */
      isHorizontal?: () => boolean;
      /**
       * Get the correct value from the value from this.chart.data.datasets[x].data[]
       * If dataValue is an object, returns .x or .y depending on the return of isHorizontal()
       * If the value is undefined, returns NaN
       * Otherwise returns the value.
       * Note that in all cases, the returned value is not guaranteed to be a Number
       */
      getRightValue?: (dataValue: any) => any;
    }

    namespace controllers {
      const line: typeof DatasetController;
      const bar: typeof DatasetController;
      const radar: typeof DatasetController;
      const doughnut: typeof DatasetController;
      const polarArea: typeof DatasetController;
      const bubble: typeof DatasetController;
    }

    abstract class DatasetController {
      /**
       * Create elements for each piece of data in the dataset.
       * Store elements in an array on the dataset as dataset.metaData
       */
      abstract addElements(): void;
      /** Create a single element for the data at the given index and reset its state. */
      abstract addElementAndReset(index: number): void;
      /**
       * Draw the representation of the dataset.
       * @param ease : if specified, this number represents how far to transition elements.
       *  See the implementation of draw() in any of the provided controllers to see how this should be used.
       */
      abstract draw(ease): void;
      /** Remove hover styling from the given element. */
      abstract removeHoverStyle(element: any): void;
      /** Add hover styling to the given element. */
      abstract setHoverStyle(element: any): void;
      /**
       * Update the elements in response to new data.
       * @param reset : if true, put the elements into a reset state so they can animate to their final values.
       */
      update(reset: boolean): void;
    }

    abstract class PluginBase {
      beforeInit(chart: Chart): void;
      afterInit(chart: Chart): void;

      resize(chart: Chart, newChartSize: any): void;

      beforeUpdate(chart: Chart): void;
      afterScaleUpdate(chartInstance): void;
      beforeDatasetsUpdate(chartInstance): void;
      afterDatasetsUpdate(chartInstance): void;
      afterUpdate(chartInstance): void;

      /**
       * This is called at the start of a render. It is only called once,
       * even if the animation will run for a number of frames.
       * Use beforeDraw or afterDraw to do something on each animation frame.
       */
      beforeRender(chartInstance): void;

      /** Easing is for animation. */
      beforeDraw(chartInstance, easing: string): void;
      afterDraw(chartInstance, easing: string): void;
      /** Before the datasets are drawn but after scales are drawn. */
      beforeDatasetsDraw(chartInstance, easing: string): void;
      afterDatasetsDraw(chartInstance, easing: string): void;

      destroy(chart: Chart): void;
    }
  }

  interface RuntimeScale {
    /** left edge of the scale bounding box */
    left?: number;
    /** right edge of the bounding box */
    right?: number;
    top?: number;
    bottom?: number;
    /** the same as right - left */
    width?: number;
    /** the same as bottom - top */
    height?: number;

    /** Margin on each side. Like css, this is outside the bounding box. */
    margins?: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };

    // Amount of padding on the inside of the bounding box (like CSS)
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  }
}
