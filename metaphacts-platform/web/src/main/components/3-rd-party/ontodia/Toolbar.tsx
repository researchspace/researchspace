/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import { Button, ButtonGroup, Dropdown, MenuItem } from 'react-bootstrap';
import * as classnames from 'classnames';
import { Workspace, ToolbarProps as BaseProps, CommandHistory, EventObserver } from 'ontodia';

import { Component } from 'platform/api/components';
import { VocabPlatform } from 'platform/api/rdf/vocabularies';
import { Permissions } from 'platform/api/services/security';

import { HasPermission } from 'platform/components/security/HasPermission';

import * as styles from './Toolbar.scss';
export const ToolbarStyles = styles;

export interface ToolbarProps extends BaseProps {
  getWorkspace?: () => Workspace;
  history?: CommandHistory;
  persistChangesLabel?: string;
  saveDiagramLabel?: string;
  onClearAll?: () => void;
  onSaveDiagramAs?: () => void;
  onPersistChangesAndSaveDiagram?: () => void;
}

export interface ToolbarCommand {
  readonly enabled: boolean;
  readonly title: string;
  readonly invoke: () => void;
}

export class Toolbar<P extends ToolbarProps = ToolbarProps, S = {}> extends Component<P, S> {
  static defaultProps: Partial<ToolbarProps> = {
    saveDiagramLabel: 'Save diagram',
    persistChangesLabel: 'Save data',
  };
  protected readonly listener = new EventObserver();

  componentDidMount() {
    const {history} = this.props;
    if (history) {
        this.listener.listen(history.events, 'historyChanged', () => {
            this.forceUpdate();
        });
    }
  }

  protected renderSaveButton() {
    const {
      canPersistChanges, saveDiagramLabel, persistChangesLabel, onPersistChanges,
      onPersistChangesAndSaveDiagram, onSaveDiagram, onSaveDiagramAs,
    } = this.props;
    if (canPersistChanges && onPersistChanges) {
      return (
        <Dropdown id='persist-changes-button' className='btn-group-sm'>
          <Button bsStyle='success'
            onClick={onPersistChanges}
            className={styles.saveButton}>
            <span className='fa fa-floppy-o' aria-hidden='true' />&nbsp;
            {persistChangesLabel}
          </Button>
          <Dropdown.Toggle bsStyle='success' />
          <Dropdown.Menu>
            <MenuItem href='#' onClick={onPersistChangesAndSaveDiagram}>
              {persistChangesLabel} &amp; {saveDiagramLabel}
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    if (onSaveDiagram) {
      return (
        <Dropdown id='save-diagram-button' className='btn-group-sm'>
          <Button bsStyle='primary'
            onClick={onSaveDiagram}
            className={styles.saveButton}>
            <span className='fa fa-floppy-o' aria-hidden='true' />&nbsp;
            {saveDiagramLabel}
          </Button>
          <Dropdown.Toggle bsStyle='primary' />
          <Dropdown.Menu>
            <MenuItem href='#' onClick={onSaveDiagramAs}>
              {saveDiagramLabel} as...
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    return null;
  }

  render() {
    const {redo, undo} = this.getUndoReduCommands(this.props.history);

    return (
        <div className={styles.component}>
          <HasPermission permission={
              Permissions.toLdp('container', VocabPlatform.OntodiaDiagramContainer, 'create', 'any')
            }>
            <ButtonGroup bsSize='small' className={styles.group}>
              {this.renderSaveButton()}
            </ButtonGroup>
          </HasPermission>
          {undo && redo ? (
            <ButtonGroup bsSize='small' className={styles.group}>
                <Button className='ontodia-btn ontodia-btn-default' title={undo.title}
                        disabled={!undo.enabled} onClick={undo.invoke}>
                    <span className='fa fa-undo' aria-hidden='true'/>
                </Button>
                <Button className='ontodia-btn ontodia-btn-default' title={redo.title}
                        disabled={!redo.enabled} onClick={redo.invoke}>
                    <span className='fa fa-repeat' aria-hidden='true'/>
                </Button>
            </ButtonGroup>
          ) : null}
          <ButtonGroup bsSize='small' className={styles.group}>
            <Button type='button' className='ontodia-btn ontodia-btn-default'
                    onClick={this.props.onForceLayout}>
                <span title='Force layout' className='fa fa-snowflake-o' aria-hidden='true' />
            </Button>
            {this.props.onClearAll ? (
              <Button onClick={this.props.onClearAll}>
                <span className='fa fa-trash' aria-hidden='true' />&nbsp;Clear All
              </Button>
            ) : null}
            <Button title='Zoom In' onClick={this.props.onZoomIn}>
                <span className='fa fa-search-plus' aria-hidden='true'/>
            </Button>
            <Button title='Zoom Out' onClick={this.props.onZoomOut}>
                <span className='fa fa-search-minus' aria-hidden='true'/>
            </Button>
            <Button title='Fit to Screen' onClick={this.props.onZoomToFit}>
                <span className='fa fa-arrows-alt' aria-hidden='true'/>
            </Button>
            <Button title='Export diagram as PNG' onClick={this.onExportPng}>
                <span className='fa fa-picture-o' aria-hidden='true'/>&nbsp;PNG
            </Button>
            <Button title='Export diagram as SVG' onClick={this.onExportSvg}>
                <span className='fa fa-picture-o' aria-hidden='true'/>&nbsp;SVG
            </Button>
            <Button title='Print diagram' onClick={this.props.onPrint}>
                <span className='fa fa-print' aria-hidden='true'/>
            </Button>
          </ButtonGroup>
          {this.renderLanguages()}
      </div>
    );
  }

  protected renderLanguages() {
    const {selectedLanguage, languages} = this.props;
    if (languages.length <= 1) { return null; }
    return (
      <ButtonGroup bsSize='small' className={classnames(styles.group, styles.languageSelector)}>
        <label>
          <span>Data Language&nbsp;-&nbsp;</span>
          <select value={selectedLanguage} onChange={this.onChangeLanguage}>
            {languages.map(({code, label}) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </ButtonGroup>
    );
  }

  protected getUndoReduCommands(history: CommandHistory) {
    let undo: ToolbarCommand;
    let redo: ToolbarCommand;
    if (history) {
        const undoCommand = last(history.undoStack);
        undo = {
            title: (undoCommand && undoCommand.title) ? `Undo (${undoCommand.title})` : 'Undo',
            enabled: Boolean(undoCommand),
            invoke: () => history.undo(),
        };
        const redoCommand = last(history.redoStack);
        redo = {
            title: (redoCommand && redoCommand.title) ? `Redo (${redoCommand.title})` : 'Redo',
            enabled: Boolean(redoCommand),
            invoke: () => history.redo(),
        };
    }

    return {undo, redo};
  }

  protected onExportPng = () => this.props.onExportPNG();
  protected onExportSvg = () => this.props.onExportSVG();

  protected onChangeLanguage = (event: React.SyntheticEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    this.props.onChangeLanguage(value);
  }
}

function last<T>(array: ReadonlyArray<T>): T | undefined {
  return array.length > 0 ? array[array.length - 1] : undefined;
}
