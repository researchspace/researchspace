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

import { createFactory, ReactElement, createElement, cloneElement, Children } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as CopyToClipboard from 'react-copy-to-clipboard';
import * as assign from 'object-assign';
import * as Kefir from 'kefir';
import * as uri from 'urijs';

import { Rdf } from 'platform/api/rdf';
import * as URLMinifierService from 'platform/api/services/url-minifier';
import { Component } from 'platform/api/components';

const FormControl = createFactory(ReactBootstrap.FormControl);
const InputGroup = createFactory(ReactBootstrap.InputGroup);
const OverlayTrigger = createFactory(ReactBootstrap.OverlayTrigger);
const Popover = createFactory(ReactBootstrap.Popover);
const Button = createFactory(ReactBootstrap.Button);

export interface Props {
  /** IRI of resource to make minified URL for. */
  iri?: string;
}

interface State {
  isLoading?: boolean;
  showLink?: boolean;
  gotLink?: string;
}

/**
 * Allow to create and copy minified URL for page.
 * If target resource IRI is not specified then current URL is used instead.
 *
 * @example
 * <mp-url-minifier iri='[[this]]'>
 *   <button class="btn btn-default">Get short URL</button>
 * </mp-url-minifier>
 */
class URLMinifier extends Component<Props, State> {
  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      isLoading: false,
      showLink: false,
      gotLink: undefined,
    };
  }

  private generateTargetURL(): Kefir.Property<string> {
    if (typeof this.props.iri === 'string') {
      return URLMinifierService.getShortURLForResource(
        Rdf.iri(this.props.iri),
        this.context.semanticContext.repository
      );
    } else {
      return URLMinifierService.makeShortURL(uri().toString());
    }
  }

  onClick = () => {
    if (this.state.showLink) {
      this.setState({ showLink: false });
    } else {
      this.generateTargetURL()
        .onValue((url) => {
          this.setState({
            isLoading: false,
            showLink: true,
            gotLink: url,
          });
        })
        .onError(() => {
          this.setState({
            isLoading: false,
            showLink: false,
            gotLink: undefined,
          });
        });
    }
  };

  shouldComponentUpdate(nextProps, nextState) {
    if (!this.state.showLink && nextState.showLink) {
      (this.refs['trigger'] as any).show();
    } else if (this.state.showLink && !nextState.showLink) {
      (this.refs['trigger'] as any).hide();
    }
    return true;
  }

  render(): ReactElement<any> {
    const child = Children.only(this.props.children) as ReactElement<any>;
    return OverlayTrigger(
      {
        ref: 'trigger',
        trigger: [],
        placement: 'bottom',
        rootClose: true,
        onExit: () => {
          this.setState({ showLink: false });
        },
        overlay: Popover(
          { id: 'url-minifier' },
          InputGroup(
            {},
            FormControl({ type: 'text', className: 'input-sm', value: this.state.gotLink, readOnly: true }),
            D.span(
              { className: 'input-group-btn' },
              createElement(
                CopyToClipboard,
                { text: this.state.showLink ? this.state.gotLink : '' },
                Button({ bsSize: 'small' }, D.i({ className: 'fa fa-copy' }))
              )
            )
          )
        ),
      },
      cloneElement(
        child,
        assign({}, child.props, {
          disabled: this.state.isLoading,
          onClick: this.onClick,
        })
      )
    );
  }
}

export type component = URLMinifier;
export const component = URLMinifier;
export const factory = createFactory(URLMinifier);
export default component;
