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
import * as classnames from 'classnames';

import { ItemViewMode } from '../Configuration';

export interface ToolbarProps extends ReorderingProps {
  baseClass: string;
  readonly: boolean;
  itemViewMode: ItemViewMode;
  onModeChanged: (newMode: ItemViewMode) => void;
  onPressCreateNewSet: () => void;
}

export class Toolbar extends React.Component<ToolbarProps, {}> {
  render() {
    const { baseClass, readonly, itemViewMode, onModeChanged, isReordering, canReorder } = this.props;

    return (
      <div className={`${baseClass}__toolbar`}>
        <div className={`${baseClass}__toolbar-buttons`} role="group">
          <ItemViewModeSwitch baseClass={baseClass} mode={itemViewMode} onModeChanged={onModeChanged} />
          {!readonly && canReorder ? <ReorderItemsButton {...this.props} /> : null}
          <div className={`${baseClass}__toolbar-spacer`}></div>
          {readonly ? null : this.renderAddNewSetButton()}
        </div>
        {isReordering && canReorder ? <ReorderConfirmation {...this.props} /> : null}
      </div>
    );
  }

  private renderAddNewSetButton() {
    return (
      <div role="group">
        {!this.props.readonly && (
          <button
            type="button"
            title="Create new set"
            className="btn btn-default btn-default-icon"
            onClick={this.props.onPressCreateNewSet}
          >
            <i className="material-icons-round">create_new_folder</i>
          </button>
        )}
      </div>
    );
  }
}

export interface ReorderingProps {
  baseClass: string;
  /**
   * Reorder UI will be hidden if false.
   */
  canReorder: boolean;
  isReordering: boolean;
  /**
   * Called to toggle reordering mode.
   */
  onPressReorder: () => void;
  onPressReorderApply: () => void;
}

export class ReorderItemsButton extends React.Component<ReorderingProps, {}> {
  render() {
    const { baseClass, isReordering, onPressReorder } = this.props;
    return (
      <div className={`${baseClass}__toggle-reorder-items`} role="group">
        <button
          type="button"
          title="Reorder items"
          aria-pressed={isReordering}
          className={classnames({ 'btn btn-default btn-default-icon': true, active: isReordering })}
          onClick={onPressReorder}
        >
          <i className="material-icons-round">low_priority</i>
        </button>
      </div>
    );
  }
}

export class ReorderConfirmation extends React.Component<ReorderingProps, {}> {
  render() {
    const { baseClass, onPressReorder, onPressReorderApply } = this.props;
    return (
      <div className={`${baseClass}__toolbar-reorder-confirmation`}>
        <div className={`${baseClass}__toolbar-reorder-message`}>Drag items to reorder</div>
        <div className={`${baseClass}__toolbar-reorder-buttons`}>
          <button
            type="button"
            title="Cancel reordering items"
            className={`btn btn-default ${baseClass}__toolbar-reorder-cancel`}
            onClick={onPressReorder}
          >
            Cancel
          </button>
          <button
            type="button"
            title="Save items order"
            className="btn btn-action"
            onClick={onPressReorderApply}
          >
            Save order
          </button>
        </div>
      </div>
    );
  }
}

export class ItemViewModeSwitch extends React.Component<
  {
    baseClass: string;
    mode: ItemViewMode;
    onModeChanged: (newMode: ItemViewMode) => void;
  },
  {}
> {
  render() {
    const { baseClass } = this.props;
    const className = `${baseClass}__item-view-mode`;
    return (
      <div className={className} role="group">
        {this.renderModeButton('grid', 'Switch to grid view', <span className="material-icons-sharp">view_module</span>)}
        {this.renderModeButton('list', 'Switch to list view', <span className="material-icons-round">view_list</span>)}
      </div>
    );
  }


  private renderModeButton(mode: ItemViewMode, title: string, children: React.ReactNode) {
    const isPressed = mode === this.props.mode;
    return (
      <button
        key={mode}
        type="button"
        title={title}
        className={classnames({ 'btn btn-default btn-default-icon': true, active: isPressed })}
        aria-pressed={isPressed}
        onClick={isPressed ? undefined : () => this.props.onModeChanged(mode)}
      >
        {children}
      </button>
    );
  }
}
