/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as maybe from 'data.maybe';
import * as moment from 'moment';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import {
  DataSet,
  DataItem,
  Timeline,
  TimelineAlignType,
  TimelineOptionsDataAttributesType,
  TimelineOptionsTemplateFunction,
  TimelineTimeAxisScaleType,
  HeightWidthType,
} from 'vis';

import { BuiltInEvents, trigger } from 'platform/api/events';
import { Component } from 'platform/api/components';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { Rdf, vocabularies } from 'platform/api/rdf';
import * as LabelsService from 'platform/api/services/resource-label';

import 'vis/dist/vis-timeline-graph2d.min.css';
import * as styles from './SemanticTimeline.scss';

export interface TimelineFormatLabelsOption {
  millisecond?: string;
  second?: string;
  minute?: string;
  hour?: string;
  weekday?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
}

export interface TimelineFormatOption {
  /**
   * Custom date format for the minor labels. Default value:
   * <pre>
   * {
   *     millisecond:'SSS',
   *     second:     's',
   *     minute:     'HH:mm',
   *     hour:       'HH:mm',
   *     weekday:    'ddd D',
   *     day:        'D',
   *     week:       'w',
   *     month:      'MMM',
   *     year:       'YYYY'
   * }
   * </pre>
   */
  minorLabels?: TimelineFormatLabelsOption;
  /**
   * Custom date format for the major labels. Default value:
   * <pre>
   * {
   *     millisecond:'HH:mm:ss',
   *     second:     'D MMMM HH:mm',
   *     minute:     'ddd D MMMM',
   *     hour:       'ddd D MMMM',
   *     weekday:    'MMMM YYYY',
   *     day:        'MMMM YYYY',
   *     week:       'MMMM YYYY',
   *     month:      'YYYY',
   *     year:       ''
   * }
   * </pre>
   */
  majorLabels?: TimelineFormatLabelsOption;
}

export interface TimelineHiddenDateOption {
  /**
   * The start date
   */
  start: string;
  /**
   * The end date
   */
  end: string;
  repeat?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface TimelineItemsAlwaysDraggableOption {
  /**
   * If true, all items in the Timeline are draggable without being selected. If false, only the selected item(s) are draggable.
   */
  item?: boolean;
  /**
   * If true, range of all items in the Timeline is draggable without being selected. If false, range is only draggable for the selected item(s). Only applicable when option <code>itemsAlwaysDraggable.item</code> is set <code>true</code>.
   */
  range?: boolean;
}

export interface TimelineMarginOption {
  /**
   * The minimal margin in pixels between items and the time axis.
   */
  axis?: number;
  /**
   * The minimal margin in pixels between items in both horizontal and vertical direction.
   */
  item?: number | TimelineMarginItem;
}

export interface TimelineMarginItem {
  /**
   * The minimal horizontal margin in pixels between items.
   */
  horizontal?: number;
  /**
   * The minimal vertical margin in pixels between items.
   */
  vertical?: number;
}

export type TimelineOrientationType = 'top' | 'bottom' | 'both' | 'none';

export interface TimelineOrientationOption {
  /**
   * Orientation of the timeline axis. If orientation is <code>bottom</code>, the time axis is drawn at the bottom. When <code>top</code>, the axis is drawn on top. When <code>both</code>, two axes are drawn, both on top and at the bottom. In case of <code>none</code>, no axis is drawn at all.
   */
  axis?: TimelineOrientationType;
  /**
   * Orientation of the timeline items. Determines whether items are aligned to the top or bottom of the Timeline.
   */
  item?: 'top' | 'bottom';
}

export interface TimelineRollingModeOption {
  /**
   * If true, the timeline will initial in a rolling mode - the current time will always be centered. I the user drags the timeline, the timeline will go out of rolling mode and a toggle button will appear. Clicking that button will go back to rolling mode. Zooming in rolling mode will zoom in to the center without consideration of the mouse position.
   */
  follow?: boolean;
  /**
   * Set how far from the left the rolling mode is implemented from. A percentage (i.e. a decimal between 0 and 1). Defaults to the middle or 0.5 (50%)
   */
  offset?: number;
}

export interface TimelineTimeAxisOption {
  /**
   * Set a fixed scale for the time axis of the Timeline.
   */
  scale?: TimelineTimeAxisScaleType;
  /**
   * Set a fixed step size for the time axis. Only applicable when used together with <code>timeAxis.scale</code>. Choose for example 1, 2, 5, or 10.
   */
  step?: number;
}

export interface TimelineTooltipOption {
  /**
   * If true, tooltips will follow the mouse as they move around in the item.
   */
  followMouse: boolean;
  /**
   * Set how the tooltip should act if it is about to overflow out of the timeline. If it is set to <code>cap</code>, the tooltip will just cap its position to inside to timeline. While if it is set to <code>flip</code>, the position of the tooltip will flip around the cursor so that a corner is at the cursor, and the rest of it is visible.
   */
  overflowMethod: 'cap' | 'flip';
}

export type TimelineZoomKey = '' | 'altKey' | 'ctrlKey' | 'metaKey';

export interface TimelineOptions {
  /**
   * Alignment of items with type <code>box</code>, <code>range</code>, and <code>background</code>. For <code>box</code> items, the <code>auto</code> alignment is <code>center</code>. For <code>range</code> items, the auto alignment is dynamic: positioned left and shifted such that the contents is always visible on screen.
   */
  align?: TimelineAlignType;
  /**
   * If true, the Timeline will automatically detect when its container is resized, and redraw itself accordingly. If false, the Timeline can be forced to repaint after its container has been resized using the function <code>redraw()</code>.
   */
  autoResize?: boolean;
  /**
   * When a Timeline is configured to be <code>clickToUse</code>, it will react to mouse and touch events only when active. When active, a blue shadow border is displayed around the Timeline. The Timeline is set active by clicking on it, and is changed to inactive again by clicking outside the Timeline or by pressing the ESC key.
   */
  clickToUse?: boolean;
  /**
   * When true, a configurator is loaded where all configuration options of the Timeline can be changed live.
   */
  configure?: boolean;
  /**
   * An array of fields optionally defined on the timeline items that will be appended as <code>data-</code> attributes to the DOM element of the items. If value is <code>'all'</code> then each field defined on the timeline item will become a <code>data-</code> attribute.
   */
  dataAttributes?: TimelineOptionsDataAttributesType;
  /**
   * The initial end date for the axis of the timeline. If not provided, the latest date present in the items set is taken as end date.
   */
  end?: string;
  /**
   * Apply custom date formatting of the labels on the time axis.
   */
  format?: TimelineFormatOption;
  /**
   * Order the groups by a field name. By default, groups are ordered by a property <code>order</code> (if set). If no <code>order</code> properties are provided, the order will be undetermined.
   */
  groupOrder?: string;
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> for the groups contents.
   * The variables that available in the template are following:
   * <pre>
   * {
   *     className?: string;
   *     content: string;
   *     id: string;
   *     style?: string;
   *     subgroupOrder?: string;
   *     title?: string;
   *     visible?: boolean;
   *     nestedGroups?: string[];
   *     showNested?: boolean;
   * }
   * </pre>
   */
  groupTemplate?: string;
  /**
   * 	The height of the timeline in pixels or as a percentage. When height is undefined or null, the height of the timeline is automatically adjusted to fit the contents. It is possible to set a maximum height using option maxHeight to prevent the timeline from getting too high in case of automatically calculated height.
   */
  height?: HeightWidthType;
  /**
   * This option allows you to hide specific timespans from the time axis. The dates can be supplied as an object: <code>{start: '2014-03-21 00:00:00', end: '2014-03-28 00:00:00', [repeat:'daily']}</code> or as an Array of these objects. The repeat argument is optional. The possible values are (case-sensitive): <code>daily, weekly, monthly, yearly</code>. To hide a weekend, pick any Saturday as start and the following Monday as end and set repeat to weekly.
   */
  hiddenDates?: TimelineHiddenDateOption | TimelineHiddenDateOption[];
  /**
   * This option allows you to scroll horizontally to move backwards and forwards in the time range. Only applicable when option <code>zoomCtrl</code> is defined or <code>zoomable</code> is <code>false</code>.
   */
  horizontalScroll?: boolean;
  /**
   * When a boolean, applies the value only to <code>itemsAlwaysDraggable.item</code>.
   */
  itemsAlwaysDraggable?: boolean | TimelineItemsAlwaysDraggableOption;
  /**
   * Select a locale for the Timeline.
   */
  locale?: string;
  /**
   * A map with i18n locales.
   */
  locales?: any;
  /**
   * When a number, applies the margin to <code>margin.axis</code>, <code>margin.item.horizontal</code>, and <code>margin.item.vertical</code>.
   */
  margin?: number | TimelineMarginOption;
  /**
   * Set a maximum Date for the visible range. It will not be possible to move beyond this maximum.
   */
  max?: string;
  /**
   * Specifies the maximum height for the Timeline.
   */
  maxHeight?: HeightWidthType;
  /**
   * Specifies the maximum number of characters that should fit in minor grid labels. If larger, less and wider grids will be drawn.
   */
  maxMinorChars?: number;
  /**
   * Set a minimum Date for the visible range. It will not be possible to move beyond this minimum.
   */
  min?: string;
  /**
   * Specifies the minimum height for the Timeline.
   */
  minHeight?: HeightWidthType;
  /**
   * Specifies whether the Timeline can be moved and zoomed by dragging the window.
   */
  moveable?: boolean;
  /**
   * If true, multiple items can be selected using ctrl+click, shift+click, or by holding items. Only applicable when option <code>selectable</code> is <code>true</code>.
   */
  multiselect?: boolean;
  /**
   * If true, selecting multiple items using shift+click will only select items residing in the same group as the first selected item. Only applicable when option <code>selectable</code> and <code>multiselect</code> are <code>true</code>.
   */
  multiselectPerGroup?: boolean;
  /**
   * Orientation of the timelines axis and items. When orientation is a string, the value is applied to both items and axis.
   */
  orientation?: TimelineOrientationType | TimelineOrientationOption;
  /**
   * Specify how the timeline implements rolling mode.
   */
  rollingMode?: TimelineRollingModeOption;
  /**
   * If true, the timeline will be right-to-left.
   */
  rtl?: boolean;
  /**
   * If true, the items on the timeline can be selected. Multiple items can be selected by long pressing them, or by using ctrl+click or shift+click.
   */
  selectable?: boolean;
  /**
   * Show a vertical bar at the current time.
   */
  showCurrentTime?: boolean;
  /**
   * By default, the timeline shows both minor and major date labels on the time axis. For example the minor labels show minutes and the major labels show hours. When <code>showMajorLabels</code> is <code>false</code>, no major labels are shown.
   */
  showMajorLabels?: boolean;
  /**
   * By default, the timeline shows both minor and major date labels on the time axis. For example the minor labels show minutes and the major labels show hours. When <code>showMinorLabels</code> is <code>false</code>, no minor labels are shown. When both <code>showMajorLabels</code> and <code>showMinorLabels</code> are false, no horizontal axis will be visible.
   */
  showMinorLabels?: boolean;
  /**
   * If true, items with titles will display a tooltip. If false, item tooltips are prevented from showing.
   */
  showTooltips?: boolean;
  /**
   * If true (default), items will be stacked on top of each other such that they do not overlap.
   */
  stack?: boolean;
  /**
   * If true (default), subgroups will be stacked on top of each other such that they do not overlap.
   */
  stackSubgroups?: boolean;
  /**
   * The initial start date for the axis of the timeline. If not provided, the earliest date present in the events is taken as start date.
   */
  start?: string;
  /**
   * Specify a fixed scale and step size for the time axis.
   */
  timeAxis?: TimelineTimeAxisOption;
  /**
   * Specifies the default type for the timeline items. Note that individual items can override this default type. If undefined, the Timeline will auto detect the type from the items data: if a start and end date is available, a 'range' will be created, and else, a 'box' is created.
   */
  type?: TimelineItemType;
  /**
   * Specify how the tooltip is positioned.
   */
  tooltip?: TimelineTooltipOption;
  /**
   * Show a vertical scroll on the side of the group list and link it to the scroll event when zoom is not triggered. Notice that defining this option as <code>true</code> will NOT override <code>horizontalScroll</code>. The scroll event will be vertically ignored, but a vertical scrollbar will be visible.
   */
  verticalScroll?: boolean;
  /**
   * 	The width of the timeline in pixels or as a percentage.
   */
  width?: HeightWidthType;
  /**
   * Specifies whether the Timeline can be zoomed by pinching or scrolling in the window. Only applicable when option <code>moveable</code> is set <code>true</code>.
   */
  zoomable?: boolean;
  /**
   * Specifies whether the Timeline is only zoomed when an additional key is down. Only applicable when option <code>moveable</code> is set <code>true</code>.
   */
  zoomKey?: TimelineZoomKey;
  /**
   * Set a maximum zoom interval for the visible range in milliseconds. It will not be possible to zoom out further than this maximum. Default value equals about 10000 years.
   */
  zoomMax?: number;
  /**
   * Set a minimum zoom interval for the visible range in milliseconds. It will not be possible to zoom in further than this minimum.
   */
  zoomMin?: number;
}

export type TimelineItemType = 'box' | 'point' | 'range' | 'background';

export interface TimelineItem {
  /**
   * A className can be used to give items an individual css style.
   */
  className?: string;
  /**
   * If set this overrides the global align configuration option for this item.
   */
  align?: TimelineAlignType;
  /**
   * The contents of the item. This can be plain text or html code.
   */
  content?: string;
  /**
   * When the group column is provided, all items with the same group are placed on one line. A vertical axis is displayed showing the groups.
   */
  group?: any;
  /**
   * An id for the item. Using an id is not required but highly recommended. An id is needed when dynamically adding, updating, and removing items in a DataSet.
   */
  id?: string;
  /**
   * A css text string to apply custom styling for an individual item.
   */
  style?: string;
  /**
   * The id of a subgroup. Groups all items within a group per subgroup, and positions them on the same height instead of staking them on top of each other. can be ordered by specifying the option 'subgroupOrder' of a group.
   */
  subgroup?: string;
  /**
   * Add a title for the item, displayed when holding the mouse on the item. The title can be an HTML element or a string containing plain text or HTML.
   */
  title?: string;
  /**
   * The type of the item. Can be 'box' (default), 'point', 'range', or 'background'. Types 'box' and 'point' need a start date, the types 'range' and 'background' needs both a start and end date.
   */
  type?: TimelineItemType;
  /**
   * Some browsers cannot handle very large DIVs so by default range DIVs can be truncated outside the visible area. Setting this to 'false' will cause the creation of full-size DIVs.
   */
  limitSize?: boolean;
}

export interface TimelineGroup {
  /**
   * A className can be used to give groups an individual css style.
   */
  className?: string;
  /**
   * The contents of the group. This can be plain text, html code or an html element.
   */
  content: string;
  /**
   * An id for the group. The group will display all items having a property group which matches the id of the group.
   */
  id: string;
  /**
   * A css text string to apply custom styling for an individual group label.
   */
  style?: string;
  /**
   * Order the subgroups by a field name or custom sort function. By default, groups are ordered by first-come, first-show.
   */
  subgroupOrder?: string;
  /**
   * A title for the group, displayed when holding the mouse on the groups label. The title can only contain plain text.
   */
  title?: string;
  /**
   * Provides a means to toggle the whether a group is displayed or not. Defaults to 'true'.
   */
  visible?: boolean;
  /**
   * Array of group ids nested in the group. Nested groups will appear under this nesting group.
   */
  nestedGroups?: string[];
  /**
   * Assuming the group has nested groups, this will set the initial state of the group - shown or collapsed. The 'showNested' is defaulted to 'true'.
   */
  showNested?: boolean;
}

interface SemanticTimelineConfigBase {
  /**
   * SPARQL select query. The required variables are <code>?start</code> and <code>?end</code>. The expected date formats are <code>YYYY-MM-DD</code>, <code>YYYY-MM-DDTHH:mm:ss</code> and <code>HH:mm:ss</code>.
   */
  query: string;
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results.
   */
  noResultTemplate?: string;
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> for the items contents.
   * @default {{start.value}} - {{end.value}}
   */
  tupleTemplate?: string;
  /**
   * Height of the items contents.
   */
  tupleTemplateHeight?: number | string;
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> of a loading which is applied when items are drawn.
   */
  loadingTemplate?: string;
  /**
   * Options that are used to customize the timeline.
   */
  options?: TimelineOptions;
  /**
   * Default options of the items
   */
  defaultItemOptions?: TimelineItem;
  /**
   * Groups that are used for the items grouping.
   * If an item has a group which is not defined in the <code>groups</code>, that group will be created automatically.
   */
  groups: Array<TimelineGroup>;
  /**
   * CSS classes for component holder element.
   */
  className?: string;
  /**
   * Parsing format.
   * By default, the <code>Y-MM-DD</code> format is used.
   * If dates have type <code>xsd:dateTime</code>, the <code>Y-MM-DDTHH:mm:ss</code> format will be used.
   * If dates have type <code>xsd:time</code>, the <code>HH:mm:ss</code> format will be used.
   */
  dateFormat?: string;
}

/*
 * This interface is used to generate JSON-Schema for typings. Where user actually provides
 * string as a value for style, which then is parsed automatically to React.CSSProperties.
 */

export interface SemanticTimelineConfig extends SemanticTimelineConfigBase {
  /**
   * CSS styles for component holder element.
   */
  style?: string;
}

export interface SemanticTimelineConfigProps extends SemanticTimelineConfigBase {
  /**
   * CSS styles for component holder element.
   */
  style?: React.CSSProperties;
  /**
   * ID for issuing component events.
   */
  id?: string;
}

export type SemanticTimelineProps = SemanticTimelineConfigProps & React.Props<SemanticTimeline>;

export type TimelineDataSet = DataSet<DataItem & any>;

interface SemanticTimelineState {
  dataSet: TimelineDataSet;
  isLoading: boolean;
  isDrawing: boolean;
  noResults: boolean;
  tupleTemplate: Data.Maybe<HandlebarsTemplateDelegate>;
  errorMessage: Data.Maybe<string | Error>;
}

const DEFAULT_OPTIONS = {
  orientation: 'top',
};

export class SemanticTimeline extends Component<SemanticTimelineProps, SemanticTimelineState> {
  public static defaultProps: Partial<SemanticTimelineProps> = {
    tupleTemplate: '{{start.value}} - {{end.value}}',
    tupleTemplateHeight: 21,
    loadingTemplate: '<span>Please wait, loading ....</span>',
    options: {},
    defaultItemOptions: {},
    groups: [],
  };

  private timeline: Timeline;

  constructor(props: SemanticTimelineProps, context: any) {
    super(props, context);

    this.state = {
      dataSet: undefined,
      isLoading: true,
      isDrawing: true,
      noResults: false,
      tupleTemplate: maybe.Nothing<HandlebarsTemplateDelegate>(),
      errorMessage: maybe.Nothing<string>(),
    };
  }

  componentDidMount() {
    this.prepareData(this.props);
  }

  componentWillReceiveProps(props: SemanticTimelineProps) {
    if (this.props.query === props.query) {
      return;
    }

    this.setState({ isLoading: true });
    this.prepareData(props);
  }

  componentWillUnmount() {
    if (this.timeline) {
      this.timeline.destroy();
    }
  }

  private parseDate(date: Rdf.Literal): moment.Moment | undefined {
    if (!date) {
      return;
    }

    let format = 'Y-MM-DD';
    const { dateFormat } = this.props;
    if (dateFormat) {
      format = dateFormat;
    } else if (date.datatype.equals(vocabularies.xsd.dateTime)) {
      format = 'Y-MM-DDTHH:mm:ss';
    } else if (date.datatype.equals(vocabularies.xsd.time)) {
      format = 'HH:mm:ss';
    }
    return moment(date.value, format);
  }

  private prepareData(props: SemanticTimelineConfigProps) {
    const context = this.context.semanticContext;
    const stream = SparqlClient.select(props.query, { context });

    stream.onValue((res) => {
      if (SparqlUtil.isSelectResultEmpty(res)) {
        this.setState({ noResults: true, errorMessage: maybe.Nothing<string>(), isLoading: false });
      } else {
        const { dataSet, errorMessage } = this.getDataSetAndError(res);
        this.setState({
          dataSet,
          noResults: false,
          errorMessage,
          isLoading: false,
        });
      }
    });

    stream.onError((error) => this.setState({ errorMessage: maybe.Just(error), isLoading: false }));

    stream.onEnd(() => {
      if (this.props.id) {
        trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
      }
    });

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: stream,
      });
    }
  }

  private validateDates(start: moment.Moment, end: moment.Moment, type: string): Error | undefined {
    if (!start) {
      return new Error('The result does not contain a start date');
    }
    // types 'box' and 'point' need a start date
    // types 'range' and 'background' needs both a start and end date
    if (!end && (type === 'range' || type === 'background')) {
      return new Error('The result does not contain an end date');
    }
    if (!start.isValid()) {
      return new Error('The start date is not valid');
    }
    if (end && !end.isValid()) {
      return new Error('The end date is not valid');
    }

    return;
  }

  private getDataSetAndError = (
    res: SparqlClient.SparqlSelectResult
  ): { dataSet: TimelineDataSet; errorMessage: Data.Maybe<string | Error> } => {
    const { defaultItemOptions } = this.props;
    const data = [];

    for (const binding of res.results.bindings) {
      const start = this.parseDate(binding.start as Rdf.Literal);
      const end = this.parseDate(binding.end as Rdf.Literal);
      const type = binding.type ? binding.type.value : defaultItemOptions.type;

      const error = this.validateDates(start, end, type);

      if (error) {
        return { dataSet: undefined, errorMessage: maybe.Just<Error>(error) };
      }

      const item = {
        ...defaultItemOptions,
        ...binding,
        content: defaultItemOptions.content || '',
        start,
        end,
        type,
        group: binding.group ? binding.group.value : defaultItemOptions.group,
        // save initial values
        _start: binding.start,
        _end: binding.end,
      };

      data.push(item);
    }

    return {
      dataSet: new DataSet(data),
      errorMessage: maybe.Nothing<string>(),
    };
  };

  private getTimelineItemTemplate = makeVisJsItemTemplateFunction(this, (item) => {
    const { tupleTemplate, tupleTemplateHeight } = this.props;
    // restore initial values that were in the result
    const options = {
      ...item,
      start: item._start,
      end: item._end,
    };
    return (
      <div style={{ height: tupleTemplateHeight }}>
        <TemplateItem template={{ source: tupleTemplate, options }} />
      </div>
    );
  });

  private getTimelineGroupTemplate = makeVisJsGroupTemplateFunction(this, (group) => {
    const { groupTemplate } = this.props.options;
    if (!groupTemplate) {
      return group.content;
    }
    return <TemplateItem template={{ source: groupTemplate, options: group }} />;
  });

  private renderFitButton = () => {
    if (this.state.isDrawing) {
      return null;
    }

    return (
      <button className={`btn btn-default ${styles.fitButton}`} onClick={() => this.timeline.fit()}>
        <i className="fa fa-expand" />
      </button>
    );
  };

  private renderLoading = () => {
    if (!this.state.isDrawing) {
      return null;
    }

    return (
      <div className={styles.loading}>
        <TemplateItem template={{ source: this.props.loadingTemplate }} />
      </div>
    );
  };

  private getTimelineOptions = () => {
    const { options } = this.props;
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      template: this.getTimelineItemTemplate,
      groupTemplate: this.getTimelineGroupTemplate,
      onInitialDrawComplete: () => {
        this.setState({ isDrawing: false });

        // temporary solution
        // redraw the timeline
        // because the content of the 'TemplateItem' component is loading asynchronously
        setTimeout(() => this.timeline.redraw(), 1000);
      },
    };
  };

  private initTimeline = (container: HTMLElement) => {
    if (!container) {
      return;
    }

    const { dataSet } = this.state;
    const options = this.getTimelineOptions();

    this.timeline = new Timeline(container, dataSet, options);

    this.initGroups();
  };

  private initGroups = () => {
    const groupsMap = _.keyBy(this.props.groups, (g) => g.id);
    const undefinedGroupsMap: { [id: string]: TimelineGroup } = {};

    this.state.dataSet.forEach(({ group }) => {
      if (!group || groupsMap[group] || undefinedGroupsMap[group]) {
        return;
      }
      undefinedGroupsMap[group] = { id: group, content: group };
    });

    this.getGroupsLabels(undefinedGroupsMap).onValue((labels) => {
      Object.keys(undefinedGroupsMap).forEach((id) => {
        const group = undefinedGroupsMap[id];
        group['content'] = labels[id];
      });
      this.setGroups({ ...groupsMap, ...undefinedGroupsMap });
    });
  };

  private getGroupsLabels(groupsMap: { [id: string]: TimelineGroup }): Kefir.Property<{ [key: string]: string }> {
    const iris = Object.keys(groupsMap).map((id) => Rdf.iri(id));
    return LabelsService.getLabels(iris).map((labels) => labels.mapKeys((k) => k.value).toObject());
  }

  private setGroups(groupsMap: { [id: string]: TimelineGroup }) {
    const groups = Object.keys(groupsMap).map((id) => groupsMap[id]);
    if (groups.length) {
      this.timeline.setGroups(groups);
    }
  }

  render() {
    const { noResultTemplate, className, style } = this.props;
    const { isLoading, noResults, errorMessage } = this.state;

    if (!errorMessage.isNothing) {
      return <ErrorNotification errorMessage={errorMessage.get()} />;
    } else if (isLoading) {
      return <Spinner />;
    } else if (noResults) {
      return <TemplateItem template={{ source: noResultTemplate }} />;
    }

    return (
      <div className={`${styles.timeline} ${className || ''}`} style={style}>
        <div ref={this.initTimeline} />
        {this.renderFitButton()}
        {this.renderLoading()}
      </div>
    );
  }
}

function makeVisJsItemTemplateFunction(
  parent: React.Component,
  renderData: (item: any) => JSX.Element
): TimelineOptionsTemplateFunction {
  return (item: any, element: Element, changedData?: any) => {
    if (!changedData) {
      return;
    }
    const markup = renderData(item);
    ReactDOM.unstable_renderSubtreeIntoContainer(parent, markup, element);
    // Cast return type to any as
    // there is incomplete function type definition of TimelineOptionsTemplateFunction,
    // the documentation states that the function can return string or ReactDOM.render() result.
    //
    // In React 16.x rendering using ReactDOM always returns null inside lifecycle methods,
    // however if we return a non-Element object, Vis.js will call template function again
    // without `changedData` specified.
    return {} as any;
  };
}

/**
 * We need to have a separate template function for groups because the API
 * is slightly different from an item one, there is no changedData parameter.
 *
 * See comment in the makeVisJsItemTemplateFunction for more details
 */
function makeVisJsGroupTemplateFunction(
  parent: React.Component,
  renderData: (item: any) => JSX.Element
): TimelineOptionsTemplateFunction {
  return (item: any, element: Element) => {
    const markup = renderData(item);
    ReactDOM.unstable_renderSubtreeIntoContainer(parent, markup, element);
    return {} as any;
  };
}

export default SemanticTimeline;
