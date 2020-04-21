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

import { createElement } from 'react';
import * as Kefir from 'kefir';
import * as assign from 'object-assign';

import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import Spinner from '../ui/spinner/Spinner';

export interface StateBase {
  loading?: boolean;
  error?: any;
}

export abstract class KefirComponentBase<P, S extends StateBase, Loaded> extends Component<P, S & Loaded> {
  protected requests: Kefir.Pool<P>;

  constructor(props: P, context?: any) {
    super(props, context);

    this.requests = Kefir.pool<P>();

    this.requests
      .flatMapLatest<Loaded>((request) => {
        if (!request) {
          return Kefir.never<Loaded>();
        }
        try {
          const task = this.loadState(request);
          return task ? task : Kefir.never<Loaded>();
        } catch (e) {
          console.error(e);
          return Kefir.constantError<any>(e.message);
        }
      })
      .onValue((state) => this.setState((previous) => assign({}, previous, { loading: false }, state)))
      .onError((error) => this.setState((previous) => assign({}, previous, { loading: false, error })));

    this.state = this.updateState({ loading: true });
  }

  protected abstract loadState(props: P): Kefir.Stream<Loaded> | undefined;

  protected updateState(partialState: StateBase | S | Loaded): Readonly<S & Loaded> {
    return assign({}, this.state, partialState);
  }

  componentDidMount() {
    this.requests.plug(Kefir.constant(this.props));
  }

  componentWillReceiveProps(nextProps: P) {
    this.requests.plug(Kefir.constant(nextProps));
  }

  componentWillUnmount() {
    this.requests.plug(Kefir.constant(undefined));
  }

  render(): React.ReactElement<any> {
    if (this.state.loading) {
      return Spinner({});
    } else if (this.state.error) {
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    } else {
      return null;
    }
  }
}
