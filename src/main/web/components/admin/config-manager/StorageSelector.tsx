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
import * as React from 'react';
import { CSSProperties } from 'react';
import ReactSelect, { Option } from 'react-select';

import { Component } from 'platform/api/components';

import { Alert, AlertType } from 'platform/components/ui/alert';

import * as styles from './StorageSelector.scss';

export interface StorageSelectorProps {
  className?: string;
  allApps: ReadonlyArray<AppStatus>;
  sourceApps: ReadonlyArray<string>;
  targetApp: string;
  onChange: (targetApp: string) => void;
}

export interface AppStatus {
  readonly appId: string;
  readonly writable: boolean;
}

export class StorageSelector extends Component<StorageSelectorProps, {}> {
  render() {
    const { allApps, sourceApps, targetApp, onChange } = this.props;

    const overrideChain: JSX.Element[] = [];
    for (let i = 0; i < sourceApps.length; i++) {
      const isLast = i === sourceApps.length - 1;
      const appId = sourceApps[i];
      overrideChain.push(
        <span key={`app-${i}`} className={isLast ? styles.effectiveApp : styles.overriddenApp}>
          {appId}
        </span>
      );
      if (!isLast) {
        overrideChain.push(
          <span key={`arrow-${i}`} className={classnames(styles.overrideArrow, 'fa fa-arrow-right')} />
        );
      }
    }

    return (
      <div className={classnames(styles.component, this.props.className)}>
        {this.renderWarning()}
        <div className={styles.mainPart}>
          {overrideChain.length === 0 ? null : (
            <div className={styles.labeledControl}>
              <span>App overrides:&nbsp;</span>
              <div className={styles.overrideChain}>{overrideChain}</div>
            </div>
          )}
          <div className={styles.labeledControl}>
            <span>Target App:&nbsp;</span>
            <ReactSelect
              className={styles.selector}
              clearable={false}
              value={targetApp}
              options={allApps.map(
                (status): Option<string> => ({
                  value: status.appId,
                  label: status.writable ? status.appId : `${status.appId} (readonly)`,
                  disabled: !status.writable,
                })
              )}
              onChange={(newValue) => {
                if (Array.isArray(newValue) || typeof newValue.value !== 'string') {
                  return;
                }
                onChange(newValue.value);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  private renderWarning() {
    const { allApps, sourceApps, targetApp, onChange } = this.props;
    if (sourceApps.length === 0) {
      return null;
    }
    const overrideOrder = allApps.map((status) => status.appId);
    const effectiveApp = sourceApps[sourceApps.length - 1];
    if (overrideOrder.indexOf(targetApp) < overrideOrder.indexOf(effectiveApp)) {
      return (
        <Alert className={styles.warning} alert={AlertType.WARNING} message={''}>
          Note: data from target app <span className={styles.effectiveApp}>{targetApp}</span> will be shadowed by
          existing data from <span className={styles.effectiveApp}>{effectiveApp}</span>.
        </Alert>
      );
    }
  }
}

export function chooseDefaultTargetApp(
  storageStatus: ReadonlyArray<AppStatus>,
  sourceAppId?: string | null
): string | undefined {
  if (storageStatus.length === 0) {
    return undefined;
  }

  const foundApp = sourceAppId
    ? storageStatus.find((s) => s.appId === sourceAppId)
    : storageStatus.find((s) => s.appId === 'runtime');

  if (foundApp && foundApp.writable) {
    return foundApp.appId;
  }

  const firstWritable = storageStatus.find((s) => s.writable);
  return firstWritable ? firstWritable.appId : undefined;
}
