/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import { OverlayTrigger, Popover, Button, ButtonGroup, Dropdown, DropdownButton, MenuItem, SplitButton } from 'react-bootstrap';
import * as classnames from 'classnames';
import { Workspace, ToolbarProps as BaseProps, CommandHistory, EventObserver, ElementTemplate } from 'ontodia';

import { Component } from 'platform/api/components';
import { VocabPlatform } from 'platform/api/rdf/vocabularies';
import { Permissions } from 'platform/api/services/security';
import ResourceLinkContainer from 'platform/api/navigation/components/ResourceLinkContainer';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { HasPermission } from 'platform/components/security/HasPermission';

import * as styles from './Toolbar.scss';
import Icon from 'platform/components/ui/icon/Icon';
import { trigger } from 'platform/api/events';
export const ToolbarStyles = styles;
import * as ToolbarEvents from './ToolbarEvents'

export interface ToolbarProps extends BaseProps {
  getWorkspace?: () => Workspace;
  history?: CommandHistory;
  persistChangesLabel?: string;
  saveDiagramLabel?: string;
  onClearAll?: () => void;
  onSaveDiagramAs?: () => void;
  onPersistChangesAndSaveDiagram?: () => void;
  diagramIri?: string;
  dropdownTemplate?: ElementTemplate;
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
        <Dropdown id="persist-changes-button" disabled={!canPersistChanges}>
          <Button
            disabled={!canPersistChanges}
            onClick={onPersistChanges}
            className="btn-action btn-split"
            bsStyle="default"
          >
            {persistChangesLabel}
          </Button>
          <Dropdown.Toggle bsStyle="default" className="btn-action" />
          <Dropdown.Menu>
            <MenuItem href="#" onClick={onPersistChangesAndSaveDiagram} draggable={false}>
              {persistChangesLabel} &amp; {saveDiagramLabel}
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    if (onSaveDiagram && canSaveDiagram) {
      return (
        <Dropdown id="save-diagram-button">
          <Dropdown.Toggle bsStyle="default" className="btn-action">
            {saveDiagramLabel}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <MenuItem href="#" onClick={onSaveDiagram} draggable={false}>
              {saveDiagramLabel}
            </MenuItem>
            <MenuItem href="#" onClick={onSaveDiagramAs} draggable={false}>
              {saveDiagramLabel} as...
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      );
    }
    return null;
  }

  protected renderSaveDataButton() {
    const {
      canPersistChanges,
      hasUnpersistedChanges,
      saveDiagramLabel,
      persistChangesLabel,
      onPersistChanges,
      onPersistChangesAndSaveDiagram,
    } = this.props;

    const canSaveData = onPersistChanges && hasUnpersistedChanges;

    return (
      <Dropdown id="persist-changes-button" disabled={!canPersistChanges || !canSaveData}>
        <Button
          disabled={!canPersistChanges || !canSaveData}
          onClick={onPersistChanges}
          className="btn-action btn-split"
          bsStyle="default"
        >
          {persistChangesLabel}
        </Button>
        <Dropdown.Toggle bsStyle="default" className="btn-action" />
        <Dropdown.Menu>
          <MenuItem href="#" onClick={onPersistChangesAndSaveDiagram} draggable={false}>
            <Icon iconType="rounded" iconName="save" symbol className="icon-left" />
            {persistChangesLabel} and map
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  protected renderSaveMapButton() {
    const { canSaveDiagram, saveDiagramLabel, onSaveDiagram, onSaveDiagramAs } = this.props;

    const canSaveMap = onSaveDiagram && canSaveDiagram;

    return (
      <SplitButton
        title={saveDiagramLabel}
        id="save-diagram-button-split"
        disabled={!canSaveMap}
        onClick={onSaveDiagram}
        bsStyle="default"
        className="btn-action btn-split"
      >
        <MenuItem href="#" onClick={onSaveDiagramAs} draggable={false}>
          <Icon iconType="rounded" iconName="save" symbol className="icon-left" />
          {saveDiagramLabel} as...
        </MenuItem>
      </SplitButton>

      /*       <Dropdown id="save-diagram-button"
                disabled={!canSaveMap}>
        <Dropdown.Toggle bsStyle='default' className="btn-action">
          {saveDiagramLabel}
        </Dropdown.Toggle>
        <Dropdown.Menu>
        <MenuItem href="#" onClick={onSaveDiagram} draggable={false}>
            {saveDiagramLabel}
          </MenuItem>
          <MenuItem href="#" onClick={onSaveDiagramAs} draggable={false}>
            {saveDiagramLabel} as...
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown> */
    );
  }

  render() {
    const { redo, undo } = this.getUndoReduCommands(this.props.history);
    const {diagramIri} = this.props
    
    function onRefreshButtonClicked() {
      trigger({
        eventType: ToolbarEvents.ToolbarRefreshed,
        source: `toolbar-${diagramIri}`,
      })
    }

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
                <Icon iconType="rounded" iconName="undo" symbol />
              </Button>
              <Button
                className="ontodia-btn ontodia-btn-default"
                title={redo.title}
                disabled={!redo.enabled}
                onClick={redo.invoke}
              >
                <Icon iconType="rounded" iconName="repeat" symbol />
              </Button>
            </ButtonGroup>
          ) : null}

          <ButtonGroup className={styles.groupButtons}>
            <Button bsStyle="default" className="btn-icon" onClick={this.props.onZoomIn}>
              <Icon iconType="rounded" iconName="add_circle_outline" symbol />
            </Button>

            <Button bsStyle="default" className="btn-icon" onClick={this.props.onZoomOut}>
              <Icon iconType="rounded" iconName="remove_circle_outline" symbol />
            </Button>

            <OverlayTrigger
              trigger={['hover']}
              placement="bottom"
              overlay={<Popover id="tooltip">Fit to screen</Popover>}
            >
              <Button bsStyle="default" className="btn-icon" onClick={this.props.onZoomToFit}>
                <Icon iconType="rounded" iconName="zoom_out_map" symbol />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              trigger={['hover']}
              placement="bottom"
              overlay={<Popover id="tooltip">Force layout</Popover>}
            >
              <Button bsStyle="default" className="btn-icon" onClick={this.props.onForceLayout}>
                <Icon iconType="rounded" iconName="auto_awesome_mosaic" symbol />
              </Button>
            </OverlayTrigger>

            {this.props.onClearAll ? (
              <OverlayTrigger
                trigger={['hover']}
                placement="bottom"
                overlay={<Popover id="tooltip">Clear all</Popover>}
              >
                <Button onClick={this.props.onClearAll} bsStyle="default" className="btn-icon">
                  <Icon iconType="rounded" iconName="layers_clear" symbol />
                </Button>
              </OverlayTrigger>
            ) : null}

            <OverlayTrigger
              trigger={['hover']}
              placement="bottom"
              overlay={<Popover id="tooltip">Print knowledge map</Popover>}
            >
              <Button
                bsStyle="default"
                className="btn-icon"
                onClick={this.props.onPrint}
                style={{ marginLeft: '30px' }}
              >
                <Icon iconType="rounded" iconName="print" symbol />
              </Button>
            </OverlayTrigger>

            <Dropdown id="export-diagram-button">
              <Dropdown.Toggle bsStyle="default" className="btn-textAndIcon btn-icon" style={{ marginRight: 20 }}>
                <Icon iconType="rounded" iconName="download" symbol />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <MenuItem href="#" onClick={this.onExportPng} draggable={false}>
                  <Icon iconType="rounded" iconName="download" symbol className="icon-left" />
                  Export as PNG
                </MenuItem>
                <MenuItem href="#" onClick={this.onExportSvg} draggable={false}>
                  <Icon iconType="rounded" iconName="download" symbol className="icon-left" />
                  Export as SVG
                </MenuItem>
              </Dropdown.Menu>
            </Dropdown>
          </ButtonGroup>
        </div>

        <div className={styles.buttonsContainer}>
            <DropdownButton title="Mapping assistant" pullRight id="mapping-assistant">
              <ResourceLinkContainer 
                uri={ConfigHolder.getDashboard().value} 
                urlqueryparam-resource-iri="http://www.researchspace.org/resource/OntologyElementsSearch"
                urlqueryparam-view="ontology-page-view"
                urlqueryparam-open-as-drag-and-drop="true"
                urlqueryparam-custom-label="Ontology Elements Descriptions" 
              >
                <MenuItem draggable={false}>
                  <Icon iconType="rounded" iconName='search' className="icon-left" symbol />
                  Ontology Elements descriptions
                </MenuItem>
              </ResourceLinkContainer>
              <ResourceLinkContainer 
                uri={ConfigHolder.getDashboard().value} 
                urlqueryparam-resource-iri="http://www.researchspace.org/resource/OntologyPropertiesSearch"
                urlqueryparam-view="ontology-page-view"
                urlqueryparam-open-as-drag-and-drop="true"
                urlqueryparam-custom-label="Ontology Properties by Class" 
              >
                <MenuItem draggable={false}>
                  <Icon iconType="rounded" iconName='search' className="icon-left" symbol />
                  Ontology Properties by class
                </MenuItem>
              </ResourceLinkContainer>
              <ResourceLinkContainer 
                uri={ConfigHolder.getDashboard().value} 
                urlqueryparam-resource-iri="http://www.researchspace.org/resource/OntologyPropertiesBetweenClassesSearch"
                urlqueryparam-view="ontology-page-view"
                urlqueryparam-open-as-drag-and-drop="true"
                urlqueryparam-custom-label="Ontology Properties between Classes" 
              >
                <MenuItem draggable={false}>
                  <Icon iconType="rounded" iconName='search' className="icon-left" symbol />
                  Ontology Properties between classes
                </MenuItem>
              </ResourceLinkContainer>
            </DropdownButton>
          {this.props.diagramIri && 
            <Button onClick={onRefreshButtonClicked} className='btn-textAndIcon' title='Refresh knowledge map'>
              <Icon iconType="rounded" iconName='refresh' symbol />
            </Button>}
          {this.renderOptionDropdown()}
          <HasPermission
            permission={Permissions.toLdp('container', VocabPlatform.OntodiaDiagramContainer, 'create', 'any')}
          >
            {/*             {this.renderSaveButton()} */}
            <>
              {this.renderSaveDataButton()}
              {this.renderSaveMapButton()}
            </>
          </HasPermission>

          {this.renderLanguages()}
        </div>
        
      </div>
    );
  }

  protected renderOptionDropdown() {
    const {diagramIri, dropdownTemplate} = this.props;
    if (!diagramIri || !dropdownTemplate) {
      return null
    }

    return dropdownTemplate
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
