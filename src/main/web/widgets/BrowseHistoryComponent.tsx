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
 * @author Mike Kelly <mkelly@britishmuseum.org>
 */

import * as React from 'react';
import { Navbar, Nav, NavItem, MenuItem, NavDropdown } from 'react-bootstrap';
import * as URI from 'urijs';
import * as _ from 'lodash';
import { resolveResourceIri } from 'platform/api/navigation';
import {
  clearPersistedRecentPages,
  MemoryHistory,
  resetMemoryHistory,
} from 'platform/api/navigation/PersistentHistory';
import { ResourceLinkComponent } from 'platform/api/navigation/components/ResourceLinkComponent';

import './BrowseHistoryComponent.scss';

interface Props {}

interface Link {
  index: number;
  link: string;
}

interface State {
  links: Array<Link>;
  menuOpen: boolean;
  locIndex: number;
}

/**
 * BrowseHistoryComponent - component to display links to recent pages in a dropdown list,
 * together with browse forwards and backwards buttons
 * It is designed to appear in the breadcrumb bar
 */

export class BrowseHistoryComponent extends React.Component<Props, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      links: [],
      menuOpen: false,
      locIndex: 0,
    };
  }

  componentDidMount() {
    this.getMemoryEntries();
  }

  private getMemoryEntries() {
    this.setState({ links: [] });
    let entries = _.uniqWith(MemoryHistory.entries, _.isEqual);
    this.setState({ locIndex: entries.indexOf(MemoryHistory.location) });
    entries.map((entry, index) => {
      let nextUri;
      const uriPath = entry.pathname + (entry.search ? entry.search : '');
      resolveResourceIri(URI(uriPath)).onValue((mUri) => {
        const entryUri = this.removeTagsFromUri(mUri.getOrElse(null));
        if (entryUri) {
          this.setState((currentState) => {
            return {
              links: currentState.links
                .concat({ index: index, link: entryUri })
                .sort((link1, link2) => link2.index - link1.index),
            };
          });
        }
      });
    });
  }

  /**
   * If the uri is surrounded by tags, remove them
   */
  private removeTagsFromUri(uri) {
    const regex = /^<(.*)>$/g;
    const strippedUri = regex.exec(uri.toString());
    return strippedUri.length > 1 ? strippedUri[1] : uri.toString();
  }

  private goBack = () => {
    MemoryHistory.goBack();
  };

  private goForward = () => {
    MemoryHistory.goForward();
  };

  private clearRecent = () => {
    this.forceMenuClosure();
    clearPersistedRecentPages();
    resetMemoryHistory();
    this.getMemoryEntries();
  };

  private dropdownToggle = (newValue) => {
    this.setState({ menuOpen: newValue });
  };

  private forceMenuClosure = () => {
    this.setState({ menuOpen: false });
  };

  render() {
    return (
      <div className="browse-history">
        <Nav bsStyle={'pills'}>
          <NavDropdown
            open={this.state.menuOpen}
            onToggle={(val) => this.dropdownToggle(val)}
            disabled={this.state.links.length < 1}
            title="Recent"
            id="basic-nav-dropdown"
          >
            {this.state.links.map((link, index) => {
              return (
                <li key={link.link + index}>
                  <ResourceLinkComponent uri={link.link} guessRepository={true}></ResourceLinkComponent>
                </li>
              );
            })}
            {this.state.links.length > 1 && <li className={'divider'}></li>}
            {this.state.links.length > 1 && (
              <li>
                <a onClick={this.clearRecent}>Clear recent</a>
              </li>
            )}
          </NavDropdown>
          <NavItem
            disabled={this.state.links.length < 2 || this.state.locIndex < 1}
            title="Back"
            onClick={this.goBack}
            href="#"
          >
            <i className="fa fa-caret-left"></i>
          </NavItem>
          <NavItem
            disabled={this.state.locIndex === this.state.links.length - 1}
            title="Forward"
            onClick={this.goForward}
            href="#"
          >
            <i className="fa fa-caret-right"></i>
          </NavItem>
        </Nav>
      </div>
    );
  }
}

export default BrowseHistoryComponent;
