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
import * as classnames from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';
import { Button, ButtonToolbar, FormControl } from 'react-bootstrap';
import ReactSelect from 'react-select';
import TextareaAutosize from 'react-textarea-autosize';

import { Component } from 'platform/api/components';
import { ConfigGroup, ConfigStorageStatus } from 'platform/api/services/config';

import { ReorderableList, Ordering } from 'platform/components/ui/reorderable-list';

import { StorageSelector, chooseDefaultTargetApp } from './StorageSelector';

import * as styles from './InlineValuesEditor.scss';

export interface InlineValuesEditorProps {
  className?: string;
  source: ConfigRecord;
  apps: ReadonlyArray<ConfigStorageStatus>;
  onSave: (values: ReadonlyArray<string>, targetApp: string) => void;
  onCancel: () => void;
}

export interface ConfigRecord {
  readonly name: string;
  readonly type: ConfigGroup['parameterType'];
  readonly values: ReadonlyArray<string>;
  readonly definedByApps: ReadonlyArray<string>;
  readonly shadowed: boolean;
}

interface State {
  order?: Ordering;
  targetValues?: ReadonlyArray<string>;
  targetApp?: string;
}

export class InlineValuesEditor extends Component<InlineValuesEditorProps, State> {
  constructor(props: InlineValuesEditorProps, context: any) {
    super(props, context);
    this.state = {
      order: Ordering.empty,
      targetValues: this.props.source.values,
      targetApp: chooseDefaultTargetApp(this.props.apps, _.last(this.props.source.definedByApps)),
    };
  }

  render() {
    const { className, source, apps, onCancel } = this.props;
    const { targetValues, targetApp, order } = this.state;

    const allowedToSave =
      targetApp &&
      !(targetApp === _.last(source.definedByApps) && isConfigValuesEqual(source.values, order.apply(targetValues)));

    return (
      <div className={classnames(styles.component, className)}>
        {this.renderInput(source.type, targetValues)}
        <StorageSelector
          className={styles.storageSelector}
          allApps={apps}
          sourceApps={source.definedByApps}
          targetApp={targetApp}
          onChange={(app) => this.setState({ targetApp: app })}
        />
        <div className={styles.footer}>
          <div className={styles.submitControls}>
            <Button className={styles.save} bsStyle="primary" disabled={!allowedToSave} onClick={this.onSave}>
              Save
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  private renderInput(type: ConfigRecord['type'], values: ReadonlyArray<string>) {
    if (type === 'boolean') {
      const isSet = values.length === 0 ? false : values[0] !== 'false';
      return (
        <input
          type="checkbox"
          checked={isSet}
          onChange={(e) => {
            const checked = e.currentTarget.checked;
            this.setState({ targetValues: [checked ? 'true' : 'false'] });
          }}
        />
      );
    } else if (type === 'stringList') {
      return (
        <div>
          <ReorderableList
            dragByHandle={true}
            itemClass={styles.reorderedItem}
            ordering={this.state.order}
            onOrderChanged={(order) => this.setState({ order })}
          >
            {values.map((value, index) => (
              <div key={index} className={styles.removableItem}>
                {this.renderMultilineEditor(value, index)}
                <Button
                  className={styles.removeItemButton}
                  onClick={() => {
                    const targetValues = [...values];
                    targetValues.splice(index, 1);
                    this.setState({ targetValues });
                  }}
                >
                  <span className="fa fa-times" />
                </Button>
              </div>
            ))}
          </ReorderableList>
          <a
            className={undefined}
            onClick={(e) => {
              e.preventDefault();
              this.setState({ targetValues: [...values, ''] });
            }}
          >
            + Add configuration value
          </a>
        </div>
      );
    } else {
      const value = values.length === 0 ? '' : values[0];
      return this.renderMultilineEditor(value, 0);
    }
  }

  private renderMultilineEditor(value: string, index: number) {
    return (
      <TextareaAutosize
        className={styles.multilineEditor}
        value={value}
        onChange={(e) => {
          const text = e.currentTarget.value;
          this.setState(
            (state): State => {
              const targetValues = [...state.targetValues];
              targetValues.splice(index, 1, text);
              return { targetValues };
            }
          );
        }}
      />
    );
  }

  private onSave = () => {
    const { onSave } = this.props;
    const { order, targetValues, targetApp } = this.state;
    const orderedValues = order.apply(targetValues);
    onSave(orderedValues, targetApp);
  };
}

function isConfigValuesEqual(left: ReadonlyArray<string>, right: ReadonlyArray<string>) {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}
