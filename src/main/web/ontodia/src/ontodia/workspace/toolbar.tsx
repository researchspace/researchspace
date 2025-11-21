import * as React from 'react';

import { WorkspaceLanguage } from './workspace';
import Icon from 'platform/components/ui/icon/Icon';

export interface ToolbarProps {
  canSaveDiagram?: boolean;
  onSaveDiagram?: () => void;
  canPersistChanges?: boolean;
  hasUnpersistedChanges?: boolean;
  onPersistChanges?: () => void;
  onForceLayout?: () => void;
  onClearAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onExportSVG?: (fileName?: string) => void;
  onExportPNG?: (fileName?: string) => void;
  onPrint?: () => void;
  languages?: ReadonlyArray<WorkspaceLanguage>;
  selectedLanguage?: string;
  onChangeLanguage?: (language: string) => void;
  hidePanels?: boolean;
}

const CLASS_NAME = 'ontodia-toolbar';

export class DefaultToolbar extends React.Component<ToolbarProps, {}> {
  private onChangeLanguage = (event: React.SyntheticEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    this.props.onChangeLanguage(value);
  };

  private onExportSVG = () => {
    this.props.onExportSVG();
  };

  private onExportPNG = () => {
    this.props.onExportPNG();
  };

  private renderSaveDiagramButton() {
    if (!this.props.onSaveDiagram) {
      return null;
    }
    return (
      <button
        type="button"
        className="saveDiagramButton ontodia-btn ontodia-btn-primary"
        disabled={this.props.canSaveDiagram === false}
        onClick={this.props.onSaveDiagram}
      >
        <Icon iconType="rounded" iconName="save" symbol /> Save diagram
      </button>
    );
  }

  private renderPersistAuthoredChangesButton() {
    if (!this.props.onPersistChanges) {
      return null;
    }
    return (
      <button
        type="button"
        className="saveDiagramButton ontodia-btn ontodia-btn-success"
        disabled={this.props.canPersistChanges === false}
        onClick={this.props.onPersistChanges}
      >
        <Icon iconType="rounded" iconName="save" symbol /> Save data
      </button>
    );
  }

  private renderLanguages() {
    const { selectedLanguage, languages } = this.props;
    if (languages.length <= 1) {
      return null;
    }

    return (
      <span className={`ontodia-btn-group ${CLASS_NAME}__language-selector`}>
        <label className="ontodia-label">
          <span>Data Language - </span>
        </label>
        <select value={selectedLanguage} onChange={this.onChangeLanguage}>
          {languages.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </span>
    );
  }

  render() {
    return (
      <div className={CLASS_NAME}>
        <div className="ontodia-btn-group ontodia-btn-group-sm">
          {this.renderSaveDiagramButton()}
          {this.renderPersistAuthoredChangesButton()}
          {this.props.onClearAll ? (
            <button
              type="button"
              className="ontodia-btn ontodia-btn-default"
              title="Clear All"
              onClick={this.props.onClearAll}
            >
              <Icon iconType="rounded" iconName="layers_clear" symbol />
              &nbsp;Clear All
            </button>
          ) : null}
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Force layout"
            onClick={this.props.onForceLayout}
          >
            <Icon iconType="rounded" iconName="schema" symbol /> Layout
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Zoom In"
            onClick={this.props.onZoomIn}
          >
            <Icon iconType="rounded" iconName="zoom_in" symbol />
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Zoom Out"
            onClick={this.props.onZoomOut}
          >
            <Icon iconType="rounded" iconName="zoom_out" symbol />
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Fit to Screen"
            onClick={this.props.onZoomToFit}
          >
            <Icon iconType="rounded" iconName="fit_screen" symbol />
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Export diagram as PNG"
            onClick={this.onExportPNG}
          >
            <Icon iconType="rounded" iconName="image" symbol /> PNG
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Export diagram as SVG"
            onClick={this.onExportSVG}
          >
            <Icon iconType="rounded" iconName="image" symbol /> SVG
          </button>
          <button
            type="button"
            className="ontodia-btn ontodia-btn-default"
            title="Print diagram"
            onClick={this.props.onPrint}
          >
            <Icon iconType="rounded" iconName="print" symbol />
          </button>
          {this.renderLanguages()}
        </div>
      </div>
    );
  }
}
