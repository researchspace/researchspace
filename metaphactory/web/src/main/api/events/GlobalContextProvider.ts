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

import {
  Component,
  Children,
} from 'react';

import { GlobalEventsContext, GlobalEventsContextTypes } from './EventsApi';
import * as EventsStore from './EventsStore';

/**
 * Components that provides platform events API to all components through React context.
 */
export class GlobalContextProvider extends Component<void, void> {
  static readonly childContextTypes = GlobalEventsContextTypes;
  getChildContext(): GlobalEventsContext {
    return {
      GLOBAL_EVENTS: {
        listen: EventsStore.listen,
        trigger: EventsStore.trigger,
      },
    };
  }


  render() {
    return Children.only(this.props.children);
  }
}
export default GlobalContextProvider;

