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
import * as SplitPane from 'react-split-pane';

import { PanelSystemHolder } from './PanelSystemHolder';

import * as styles from './PanelSystem.scss';

export interface Props {}

export interface State {
  size?: string | number;
  expandedPanelKey?: React.Key;
}

export class PanelSystem extends React.Component<Props, State> {
  private prevSize: string | number;

  constructor(props: Props) {
    super(props);
    this.state = { size: '50%' };
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.size !== prevState.size) {
      window.dispatchEvent(new Event('resize'));
    }
  }

  private onChangeHolder = (key: React.Key) => {
    this.setState(({ expandedPanelKey }) => {
      if (expandedPanelKey && expandedPanelKey !== key) {
        return { size: this.prevSize, expandedPanelKey: undefined };
      }
      return null;
    });
  };

  private renderPanel = (panel: React.ReactChild, index: number) => {
    if (typeof panel !== 'object' || panel.type !== PanelSystemHolder) {
      return null;
    }

    const { expandedPanelKey } = this.state;
    const key = panel.props.id;
    return (
      <div className={styles.panel}>
        {React.cloneElement(panel, {
          ...panel.props,
          onChangeHolder: () => {
            this.onChangeHolder(key);
          },
        })}
        {expandedPanelKey === key ? (
          <button
            className={`btn btn-default btn-xs ${styles.fullScreenButton}`}
            onClick={() => this.setState({ size: this.prevSize, expandedPanelKey: undefined })}
          >
            <i className="fa fa-compress" />
          </button>
        ) : (
          <button
            className={`btn btn-default btn-xs ${styles.fullScreenButton}`}
            onClick={() =>
              this.setState(({ size }) => {
                this.prevSize = size;
                return { size: `${index ? 0 : 100}%`, expandedPanelKey: key };
              })
            }
          >
            <i className="fa fa-expand" />
          </button>
        )}
      </div>
    );
  };

  render() {
    return (
      <SplitPane
        split="horizontal"
        minSize={0}
        size={this.state.size}
        paneStyle={{ overflow: 'hidden' }}
        pane1Style={{ borderBottom: '1px solid #a2a2a2' }}
        onChange={(size) => this.setState({ size, expandedPanelKey: undefined })}
      >
        {React.Children.map(this.props.children, this.renderPanel)}
      </SplitPane>
    );
  }
}

export default PanelSystem;
