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
    saveDiagramLabel: 'Save map',
    persistChangesLabel: 'Save data',
  };
  protected readonly listener = new EventObserver();

  componentDidMount() {
    const { history } = this.props;
    if (history) {
      this.listener.listen(history.events, 'historyChanged', () => {
        this.forceUpdate();
      });
    }
  }

  protected renderSaveButton() {
    const {
      canPersistChanges,
      hasUnpersistedChanges,
      canSaveDiagram,
      saveDiagramLabel,
      persistChangesLabel,
      onPersistChanges,
      onPersistChangesAndSaveDiagram,
      onSaveDiagram,
      onSaveDiagramAs,
    } = this.props;
    if (onPersistChanges && hasUnpersistedChanges) {
      return (
        <Dropdown id="persist-changes-button"
          disabled={!canPersistChanges}
        >
          <Button disabled={!canPersistChanges}
                  onClick={onPersistChanges} 
                  className="btn btn-action"
                  bsStyle=''
          >
            {persistChangesLabel}
          </Button>
          <Dropdown.Toggle bsStyle='' className="btn btn-action" />
          <Dropdown.Menu>
            <MenuItem href="#" onClick={onPersistChangesAndSaveDiagram}>
              {persistChangesLabel} &amp; {saveDiagramLabel}
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    if (onSaveDiagram && canSaveDiagram) {
      return (
        <Dropdown id="save-diagram-button">
          <Button onClick={onSaveDiagram}
                  className="btn btn-action"
                  bsStyle=''
                  >
            {saveDiagramLabel}
          </Button>
          <Dropdown.Toggle bsStyle='' className="btn btn-action" />
          <Dropdown.Menu>
            <MenuItem href="#" onClick={onSaveDiagramAs}>
              {saveDiagramLabel} as...
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    return null;
  }

  render() {
    const { redo, undo } = this.getUndoReduCommands(this.props.history);

    return (
      <div className={styles.component}>

      <div className={styles.buttonsContainer}>
        {undo && redo ? (
          <ButtonGroup>
            <Button
              className="ontodia-btn ontodia-btn-default"
              title={undo.title}
              disabled={!undo.enabled}
              onClick={undo.invoke}
            >
              <span className="fa fa-undo" aria-hidden="true" />
            </Button>
            <Button
              className="ontodia-btn ontodia-btn-default"
              title={redo.title}
              disabled={!redo.enabled}
              onClick={redo.invoke}
            >
              <span className="fa fa-repeat" aria-hidden="true" />
            </Button>
          </ButtonGroup>
        ) : null}

        <ButtonGroup className={styles.groupButtons}>
          <Button title="Zoom In" className="btn btn-toolbar" onClick={this.props.onZoomIn}>
            <span className="fa fa-search-plus" aria-hidden="true" />
            Zoom in
          </Button>

          <Button title="Zoom Out" className="btn btn-toolbar" onClick={this.props.onZoomOut}>
            <span className="fa fa-search-minus" aria-hidden="true" />
            Zoom out
          </Button>
      
          <Button title="Fit to Screen" className="btn btn-toolbar" onClick={this.props.onZoomToFit}>
            <span className="fa fa-arrows-alt" aria-hidden="true" />
            Fit to screen
          </Button>
        </ButtonGroup>

        <ButtonGroup className={styles.groupButtons}>
          <Button title="Force layout" className="btn btn-toolbar" onClick={this.props.onForceLayout}>
            <span  className="fa fa-snowflake-o" aria-hidden="true" />
            Force Layout
          </Button>

          {this.props.onClearAll ? (
            <Button onClick={this.props.onClearAll} className="btn btn-toolbar">
              <span className="fa fa-trash" aria-hidden="true" />
              Clear All
            </Button>
          ) : null}
        </ButtonGroup>

        <ButtonGroup className={styles.groupButtons}>
          <Button title="Export map as PNG" className="btn btn-toolbar" onClick={this.onExportPng}>
            <span className="fa fa-picture-o" aria-hidden="true" />
            Export PNG
          </Button>
          
          <Button title="Export map as SVG" className="btn btn-toolbar" onClick={this.onExportSvg}>
            <span className="fa fa-picture-o" aria-hidden="true" />
            Export SVG
          </Button>

          <Button title="Print diagram" className="btn btn-toolbar" onClick={this.props.onPrint}>
            <span className="fa fa-print" aria-hidden="true" />
            Print
          </Button>
        </ButtonGroup>
          
        </div>

        <HasPermission permission={Permissions.toLdp('container', VocabPlatform.OntodiaDiagramContainer, 'create', 'any')}
        >
          {this.renderSaveButton()}
        </HasPermission>
         
        {this.renderLanguages()}
      </div>
    );
  }

  protected renderLanguages() {
    const { selectedLanguage, languages } = this.props;
    if (languages.length <= 1) {
      return null;
    }
    return (
      <ButtonGroup bsSize="small" className={classnames(styles.groupButtons, styles.languageSelector)}>
        <label>
          <span>Data Language&nbsp;-&nbsp;</span>
          <select value={selectedLanguage} onChange={this.onChangeLanguage}>
            {languages.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
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
        title: undoCommand && undoCommand.title ? `Undo (${undoCommand.title})` : 'Undo',
        enabled: Boolean(undoCommand),
        invoke: () => history.undo(),
      };
      const redoCommand = last(history.redoStack);
      redo = {
        title: redoCommand && redoCommand.title ? `Redo (${redoCommand.title})` : 'Redo',
        enabled: Boolean(redoCommand),
        invoke: () => history.redo(),
      };
    }

    return { undo, redo };
  }

  protected onExportPng = () => this.props.onExportPNG();
  protected onExportSvg = () => this.props.onExportSVG();

  protected onChangeLanguage = (event: React.SyntheticEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    this.props.onChangeLanguage(value);
  };
}

function last<T>(array: ReadonlyArray<T>): T | undefined {
  return array.length > 0 ? array[array.length - 1] : undefined;
}
