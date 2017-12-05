/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as React from 'react';
import * as moment from 'moment';
import * as Either from 'data.either';
import * as URI from 'urijs';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as Handlebars from 'handlebars';

import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { HideableLink } from 'platform/components/utils';

import * as TimelineModule from './Timeline';
import './SemanticTimeline.scss';

var D = React.DOM;

declare var Timeline;

export interface SemanticTimelineConfig {
  query: string;
  noResultTemplate?: string;
  tupleTemplate?: string;

  interval?: string
  desc?: string
  start: string
  end: string
  label: string
  link: string
  image?: string
  timezone?: string
  colwidth?: string
  height?: number
  durationEvent?: boolean
}

export type SemanticTimelineProps = SemanticTimelineConfig & React.Props<SemanticTimeline>;
interface SemanticTimelineState {
  events?: Data.Either<string, TimelineModule.Event []>
  bands?: TimelineModule.BandConfig []
  isLoading: boolean
  noResults?: boolean
  layout ?: { tupleTemplate: Data.Maybe<HandlebarsTemplateDelegate>}
}

export class SemanticTimeline extends React.Component<SemanticTimelineProps, SemanticTimelineState> {

  constructor(props: SemanticTimelineProps) {
    super(props);
    this.state = {
      isLoading: true,
      noResults: false,
    };
  }
  private static convertToDate(value: string, dateFormats: any[]): any {
    // this some workaround since JS requires two leading zeros in order to parse according to the ISO standard
    // see http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.15.1
    // see http://scholarslab.org/research-and-development/parsing-bc-dates-with-javascript/
    // http://stackoverflow.com/questions/18623783/get-the-time-difference-between-two-datetimes
    if (_.startsWith(value, '-')) {
      var m = moment(value, dateFormats);
      m.year(parseInt('-' + m.year()));
      return m.toDate();
    }
    return moment(value, dateFormats).toDate();
  }

  private static guessZoomSteps(duration: moment.Moment): any {
    return {
              zoomIndex:      3,
              zoomSteps:      new Array(
                {pixelsPerInterval: 400,  unit: Timeline.DateTime.DECADE},
                {pixelsPerInterval: 300,  unit: Timeline.DateTime.CENTURY},
                {pixelsPerInterval: 200,  unit: Timeline.DateTime.MILLENNIUM}, // DEFAULT zoomIndex
                {pixelsPerInterval: 100,  unit: Timeline.DateTime.MILLENNIUM} // DEFAULT zoomIndex
              ),
            };
  }

  private static guessInterval(duration: moment.Moment): string {
    var year = duration.year();
    if (year > 1000) {
      return Timeline.DateTime.MILLENNIUM;
    }
    if (100 < year && year < 1000) {
      return Timeline.DateTime.CENTURY;
    }
    if (10 < year && year < 100) {
      return Timeline.DateTime.DECADE;
    }
    if (1 < year && year < 10) {
      return Timeline.DateTime.YEAR;
    }

    var month = duration.month();
    if (month > 3) {
      return Timeline.DateTime.QUARTER;
    }
    if (1 < month && month < 3) {
      return Timeline.DateTime.MONTH;
    }

    var day = duration.day();
    if (month === 1 && day > 1) {
      return Timeline.DateTime.DAY;
    }
    if (day <= 1) {
      return Timeline.DateTime.HOUR;
    }
    return Timeline.DateTime.CENTURY;
  }

  componentDidMount() {
    this.prepareData(this.props);
  }

  componentWillReceiveProps(props) {
    this.prepareData(props);
  }

  componentWillMount() {
    this.compileTemplatesInConfig(this.props);
  }

  private prepareData(props: SemanticTimelineConfig) {
        var dateFormats = ['YYYY-MM-DDZ', 'YYYY-MM-D', "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ssZ", 'EEE, d MMM yyyy HH:mm:ss Z', 'yyyy-MM-dd', 'yyyy'];

    var query = SparqlUtil.parseQuery(props.query);
    var stream = SparqlClient.select(query);
    stream.onValue(res => {
      var events =
          _.map(res.results.bindings, x => {
            return {
              start: SemanticTimeline.convertToDate(x[props.start].value, dateFormats),
              end: SemanticTimeline.convertToDate(x[props.end].value, dateFormats),
              title: x[props.label].value,
              color: '#1D719F',
              icon: 'red-circle.png',
              durationEvent: props.durationEvent,
              image: _.isUndefined(x[props.image]) ? '' : x[props.image].value,
              description: '',
              tuple: x,
              // TODO remove this when we unify timeline templates config
              link: URI(
                './?uri=' + encodeURIComponent(x[props.link].value)
              ).absoluteTo(window.location.href).toString(),
            };
          });
        if (!_.isEmpty(events)) {
          var theme = Timeline.ClassicTheme.create();
          theme.event.bubble.width = 320;
          theme.ether.backgroundColors = [
            '#D1CECA',
            '#E7DFD6',
            '#E8E8F4',
            '#D0D0E8',
          ];

          var allDates = _.union(
            _.map(events, e => moment( e.end, moment.ISO_8601)),
            _.map(events, e => moment(e.start, moment.ISO_8601))
            );
          var minDate = moment.min(...allDates);
          var maxDate = moment.max(...allDates);
          var duration = moment(moment.duration(minDate.diff(maxDate)));
          var band = {
              width: '100%',
              date: events[0].start,
              intervalUnit: _.isString(props.interval) ? Timeline.DateTime[props.interval] : SemanticTimeline.guessInterval(duration) ,
              intervalPixels: 100,
              timeZone: '0',
              theme: theme,
              };
           // add zoom steps
           _.assign(band, SemanticTimeline.guessZoomSteps(duration));
          this.setState({
            isLoading: false,
            events: Either.fromNullable<string, TimelineModule.Event[]>(events),
            bands: [band],
          });
        }else {
          this.setState({noResults: true, isLoading: false});
        }
    });
    stream.onError(
      error =>
          this.setState({
            isLoading: false,
            events: Either.Left<string, TimelineModule.Event[]>(error),
          })
    );
  }

  private compileTemplatesInConfig(config: SemanticTimelineConfig) {
    var  layout = {
      tupleTemplate:  maybe.fromNullable(config.tupleTemplate).map(Handlebars.compile),
    };

    this.setState({
      layout: layout,
      isLoading: true,
    });
  }

  private static renderErrorMessage(error) {
    return React.createElement(ErrorNotification, {
      errorMessage: error,
    });
  }

  private renderTimeline = (config: SemanticTimelineConfig, bands) => (events) => {
    var timeline = TimelineModule.TimelineElement({
      ref: 'ref-timeline-component',
      events: events,
      bands: bands,
      height: config.height,
      tupleTemplate: this.state.layout.tupleTemplate,
    });
    return D.div({}, [
         timeline,
         this.getHideableExpandLink(),
        ]);
  }

  private getHideableExpandLink() {
    if (_.isUndefined(this.props.height)) { return null; }
    return React.createElement(HideableLink, {
        className: 'semantic-timeline__timeline-expand-link',
        linkText: 'Expand',
        onClick: this.expandTimeLineContainerSize.bind(this),
        });
  }

  private expandTimeLineContainerSize() {
    var t: any = this.refs['ref-timeline-component'];
    t.setAutoWidth(true);
    t.handleResize();
  }

  private getTimeline() {
    if (this.state.isLoading) { return React.createElement(Spinner); }
    if (this.state.noResults) {
      return React.createElement(TemplateItem, {template: {source: this.props.noResultTemplate}});
    }
    return this.state.events.fold<React.ReactElement<any>>(
          SemanticTimeline.renderErrorMessage,
          this.renderTimeline(this.props, this.state.bands)
        );
  }

  render() {
    return D.div(
      {className: 'metaphacts-timeline-component'},
      this.getTimeline()
    );
  }
}
export default SemanticTimeline;
