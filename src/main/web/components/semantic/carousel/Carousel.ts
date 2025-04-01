/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { createFactory, createElement, Props } from 'react';
import * as D from 'react-dom-factories';
import Slider from 'react-slick';
import * as _ from 'lodash';
import * as assign from 'object-assign';

import { Component, ComponentContext } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';

const SliderComponent = createFactory(Slider);

import './SemanticCarousel.scss';

export interface ReactSlickOptions {
  /**
   * Enables tabbing and arrow key navigation
   *
   * @default true
   */
  accessibility?: boolean;

  /**
   * Enables adaptive height for single slide horizontal carousels
   *
   * @default false
   */
  adaptiveHeight?: boolean;

  /**
   * Show left and right nav arrows
   *
   * @default true
   */
  arrows?: boolean;

  /**
   * Enables Autoplay
   *
   * @default false
   */
  autoplay?: boolean;

  /**
   * Autoplay Speed in milliseconds
   *
   * @default 3000
   */
  autoplaySpeed?: number;

  /**
   * Enables centered view with partial prev/next slides
   *
   * @default false
   */
  centerMode?: boolean;

  /**
   * Additional class name for the inner slider div
   */
  className?: string;

  /**
   * Show dot indicators
   *
   * @default false
   */
  dots?: boolean;

  /**
   * Class for slide indicator dots container
   *
   * @default 'slick-dots'
   */
  dotsClass?: string;

  /**
   * Enable mouse dragging
   *
   * @default true
   */
  draggable?: boolean;

  /**
   * Enable fade
   *
   * @default false
   */
  fade?: boolean;

  /**
   * Go to slide on click
   *
   * @default false
   */
  focusOnSelect?: boolean;

  /**
   * Infinite loop sliding
   *
   * @default true
   */
  infinite?: boolean;

  /**
   * Slide to start on
   *
   * @default 0
   */
  initialSlide?: number;

  /**
   * Loads images or renders components on demands
   *
   * @default false
   */
  lazyLoad?: boolean;

  /**
   * Pause Autoplay On Hover
   *
   * @default true
   */
  pauseOnHover?: boolean;

  /**
   * Object containing breakpoints and settings objects.
   * Enables settings sets at given screen width.
   * Breakpoints in the array should be ordered from smalles to greatest.
   *
   * @example [ { breakpoint: 768, settings: { slidesToShow: 3 } }, { breakpoint: 1024, settings: { slidesToShow: 5 } }, { breakpoint: 100000, settings: 'unslick' } ]
   */
  responsive?: Array<{
    /**
     * maxWidth so the settings will be applied when resolution is below this value
     */
    breakpoint: number;

    /**
     * Set settings to "unslick" instead of an object to disable slick at a given breakpoint.
     */
    settings: 'unslick' | ReactSlickOptions;
  }>;

  /**
   * Change the slider's direction to become right-to-left
   *
   * @default false
   */
  rtl?: boolean;

  /**
   * Number of slides to be visible at a time
   *
   * @default 1
   */
  slidesToShow?: number;

  /**
   * Enable/Disable CSS Transitions
   *
   * @default true
   */
  useCSS?: boolean;

  /**
   * Vertical slide mode
   *
   * @default false
   */
  vertical?: boolean;
}

export interface CarouselConfig {
  /**
   * Data to be displayed in the carousel
   */
  data: Array<Record<string, any>>;

  /**
   * [handlebars.js](http://handlebarsjs.com/) HTML slide template.
   * Data object properties are available in the template
   */
  tupleTemplate: string;

  /**
   * Additional carousel config options propagated to underlying library [react-slick](https://github.com/akiran/react-slick)
   */
  options?: ReactSlickOptions;
}

export type CarouselProps = CarouselConfig & Props<Carousel>;

export class Carousel extends Component<CarouselProps, {}> {
  constructor(props: CarouselProps, context: ComponentContext) {
    super(props, context);
  }

  public render() {
    if (!this.props.data || this.props.data.length === 0) {
      return null;
    }

    return D.div(
      { className: 'semantic-carousel' },
      this.getSliderComponent(this.props.data)
    );
  }

  public getSliderComponent(data: Array<Record<string, any>>) {
    const defaultSettings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      lazyLoad: true,
      slidesToScroll: 1,
    };
    const settings = assign({}, defaultSettings, this.props.options);
    const items = _.map(data, (tuple, i) => {
      // slides needs to be wrapped in div
      // see https://github.com/akiran/react-slick/issues/328
      return D.div(
        { key: i },
        createElement(TemplateItem, {
          template: {
            source: this.props.tupleTemplate,
            options: tuple,
          },
          componentProps: {
            className: 'semantic-carousel-item',
          },
        })
      );
    });
    return SliderComponent(settings, items);
  }
}

export default Carousel;
