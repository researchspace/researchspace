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
import { findDOMNode } from 'react-dom';
import * as $ from 'jquery';
import * as assign from 'object-assign';
import * as _ from 'lodash';

window['jQuery'] = $; // hack to make timeline work

declare var SimileAjax;
declare var Timeline;

window['SimileAjax'] = {
  loaded:                 false,
  loadingScriptsCount:    0,
  error:                  null,
  Platform: new Object(),
};

require('./lib/timeline_2.3.0/timeline_js/images/red-circle.png');
require('./lib/timeline_2.3.0/timeline_js/images/copyright-vertical.png');
require('./lib/timeline_2.3.0/timeline_js/images/progress-running.gif');

require('./lib/timeline_2.3.0/timeline_ajax/styles/graphics.css');
require('./lib/timeline_2.3.0/timeline_js/timeline-bundle.css');

require('simile-ajax-bundle');
SimileAjax.History.enabled = false;
window['Timeline'] = new Object();
Timeline.DateTime = SimileAjax.DateTime; // for backward compatibility
Timeline.serverLocale = 'en';
Timeline.clientLocale = 'en';
Timeline.urlPrefix = '../assets/';
require('timeline-bundle');
require('./lib/timeline_2.3.0/timeline_js/scripts/l10n/en/timeline.js');
require('./lib/timeline_2.3.0/timeline_js/scripts/l10n/en/labellers.js');

export interface Event {
  start: Date
  end: Date
  title: string
  description: string
  color?: string
  icon?: string
  durationEvent?: boolean
  image?: string
  link?: string
  tuple: {}
}

export interface BandConfig {
  date: Date
  width: string
  timeZone: string
  intervalPixels: number
  intervalUnit: string
}

interface Band extends BandConfig {
  eventSource?: any
}

export interface TimelineProps extends React.Props<TimelineComponent> {
  events: Event[]
  bands: BandConfig []
  height: number
  tupleTemplate: Data.Maybe<HandlebarsTemplateDelegate>
}

export class TimelineComponent extends React.Component<TimelineProps, any> {
  constructor(props: TimelineProps) {
    super(props);
  }

  timeline: any;

  public handleResize() {
    if (!_.isNull(this.timeline)) {
      this.timeline.layout();
    }
  }

  public setCenterDate(date: Date, band: number) {
    if (!_.isNull(this.timeline)) {
      this.timeline.getBand(band).setCenterVisibleDate(date);
    }
  }

  public setAutoWidth(v: boolean) {
    // set auto width i.e. height of the timeline. will affect all bands
    if (!_.isNull(this.timeline)) {
      this.timeline['autoWidth'] = v;
    }
  }

  componentDidMount() {
    this.createTimeline(this.props);
  }

  componentWillReceiveProps(props) {
    this.destroyTimeline();
    this.createTimeline(props);
  }

  componentWillUnmount() {
    this.destroyTimeline();
  }

  render() {
    return React.DOM.div({style: {height: this.props.height}});
  }

  private createTimeline(props) {
    if (!_.isUndefined(props.tupleTemplate) && !props.tupleTemplate.isNothing) {
      var that = this;
      var oldFillInfoBubble = Timeline.DefaultEventSource.Event.prototype.fillInfoBubble;
      var renderTemplate = (eventObject) => {
        return props.tupleTemplate.map(
          (template) =>  template(
            assign(
              eventObject._obj.tuple,
              {
                _event: eventObject._obj,
              }
            )
          )
        ).getOrElse('');
      };

      Timeline.DefaultEventSource.Event.prototype.fillInfoBubble =
          function (elmt, theme, labeller) {
            var eventObject = this;
            if (that.props.tupleTemplate.isJust) {
              // because of the nature of simile timeline popups
              // we need to render template twice, otherwise
              // custom components will not be instantiated
              elmt.innerHTML = renderTemplate(eventObject);
              window.setTimeout(() => {
                elmt.innerHTML = renderTemplate(eventObject);
              }, 300);
            } else {
              oldFillInfoBubble.call(this, elmt, theme, labeller);
            }
          };
    }

    window.addEventListener('resize', this.handleResize);
    var element = findDOMNode(this);

    var eventSource = new Timeline.DefaultEventSource();
    var bands = _.map(props.bands, band => {
      (<Band>band).eventSource = eventSource;
      return Timeline.createBandInfo(band);
    });
    this.timeline = Timeline.create(element, bands);
    var url = '../assets/'; // The base url for image, icon and background image
    eventSource.loadJSON({'events': props.events}, url);
  }

  private destroyTimeline() {
    this.timeline.dispose();
    this.timeline = null;
  }
}

export const TimelineElement = React.createFactory(TimelineComponent);
export default TimelineElement;
