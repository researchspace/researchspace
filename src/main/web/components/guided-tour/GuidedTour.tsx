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

/**
 * @author Mike Kelly <MKelly@britishmuseum.org>
 * @author Olga Belyaeva
 */

import * as React from 'react';
import * as _ from 'lodash';
import ReactJoyride from 'react-joyride';
import { Props as JoyrideProps } from 'react-joyride';
import { Overlay } from 'react-bootstrap';

import { listen, Event } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { BrowserPersistence } from 'platform/components/utils';

import { GuidedTourRunIfNotSeen, GuidedTourStart } from './GuidedTourEvents';

import 'react-joyride/src/styles/react-joyride.scss';

const GUIDED_TOUR = 'mp-guided-tour';
const LocalStorageState = BrowserPersistence.adapter<{
  readonly wasDisplayed?: boolean;
}>();

export interface Props extends JoyrideProps {
  id: string;
}

export interface State {
  run?: boolean;
  autoStart?: boolean;
}

/**
 * Guided tour component allows to showcase or explain functionality of complex features.
 *
 * @example
 * <mp-guided-tour id='guided-tour' steps='[{
 *   "text": "Step 1",
 *   "selector": "#step1",
 *   "position": "bottom"
 * }, {
 *   "text": "Step 2",
 *   "selector": "#step2",
 *   "position": "top",
 *   "style": {"button": {"display": "none"}},
 *   <!--
 *     define `progressEvent` property to switch guided tour to the next step by the user action
 *   -->
 *   "progressEvent": {"eventType": "Component.Loaded", "source": "source-id"}
 * }, {
 *   "text": "Step 3",
 *   "selector": "#step3",
 *   "position": "left"
 * }]'></mp-guided-tour>
 *
 * <!-- use `mp-event-trigger` component to start guided tour -->
 * <mp-event-trigger id='guided-tour-start' type='GuidedTour.Start' targets='["guided-tour"]'>
 *   <a>Tour trigger</a>
 * </mp-event-trigger>
 *
 * <!-- use `mp-event-proxy` component to run guided tour if it wasn't seen -->
 * <mp-event-proxy id='guided-tour-run' on-event-type='Component.Loaded' on-event-source='source-id'
 *   proxy-event-type='GuidedTour.RunIfNotSeen' proxy-targets='["guided-tour"]'>
 * </mp-event-proxy>
 */
export class GuidedTour extends React.Component<Props, State> {
  static readonly defaultProps: Partial<Props> = {
    autoStart: false,
    showOverlay: false,
    type: 'continuous',
    locale: { back: '', skip: 'Skip Tour', close: 'Close', last: 'OK, got it', next: 'Next' },
    showSkipButton: true,
    tooltipOffset: 10,
    keyboardNavigation: false,
    scrollToSteps: false,
  };
  private readonly cancellation = new Cancellation();
  private tourJoyride: ReactJoyride;

  constructor(props: Props) {
    super(props);
    this.state = {
      run: props.run,
      autoStart: props.autoStart,
    };
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onInitJoyride = (tourJoyride: ReactJoyride) => {
    if (tourJoyride) {
      this.tourJoyride = tourJoyride;
      this.registerEventListener();
    }
  };

  private registerEventListener() {
    const { id: target } = this.props;
    this.cancellation.map(listen({ eventType: GuidedTourRunIfNotSeen, target })).onValue(() => {
      if (!LocalStorageState.get(GUIDED_TOUR).wasDisplayed) {
        LocalStorageState.set(GUIDED_TOUR, { wasDisplayed: true });
        this.setState({ run: true });
      }
    });
    this.cancellation.map(listen({ eventType: GuidedTourStart, target })).onValue(() => {
      this.setState({ autoStart: true, run: true });
      this.tourJoyride.reset(true);
    });
    this.listenToStepsEvents();
  }

  private listenToStepsEvents() {
    const uniqueEvents = _.uniqWith(
      this.props.steps,
      (step, otherStep) =>
        step.progressEvent &&
        otherStep.progressEvent &&
        step.progressEvent.eventType === otherStep.progressEvent.eventType &&
        step.progressEvent.source === otherStep.progressEvent.source
    );
    uniqueEvents.forEach(({ progressEvent }) => {
      if (!progressEvent) {
        return;
      }
      this.cancellation
        .map(listen({ eventType: progressEvent.eventType, source: progressEvent.source }))
        .onValue((event) => {
          if (!this.state.run) {
            return;
          }
          // HACK: Give joyride time to process previous step
          setTimeout(() => this.goToNextStep(event), 200);
        });
    });
  }

  private goToNextStep(event: Event<any>) {
    const { eventType, source, data } = event;
    const progress = this.tourJoyride.getProgress();
    const { progressEvent } = progress.step;
    if (progressEvent && progressEvent.eventType === eventType && progressEvent.source === source) {
      if (progressEvent.data === data && progress.index < this.props.steps.length - 1) {
        const selector = this.props.steps[progress.index + 1].selector;
        // if next step has selector then we should wait until corresponding element is rendered
        const advance = !selector || document.querySelector(selector);
        if (advance) {
          this.tourJoyride.next();
        } else {
          const componentExists = setInterval(() => {
            if (document.querySelector(selector)) {
              clearInterval(componentExists);
              this.tourJoyride.next();
            }
          }, 200);
        }
      } else {
        this.setState({ run: false });
      }
    }
  }

  render() {
    const { run, autoStart } = this.state;
    return (
      <Overlay show={true}>
        <ReactJoyride
          ref={this.onInitJoyride}
          {...this.props}
          run={run}
          autoStart={autoStart}
          callback={(event) => {
            if (event.type === 'finished') {
              this.setState({ run: false, autoStart: false });
            }
          }}
        />
      </Overlay>
    );
  }
}

export default GuidedTour;
