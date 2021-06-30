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

export interface FooterProps extends ReorderingProps {
  baseClass: string;
  readonly: boolean;
  itemViewMode: ItemViewMode;
  onModeChanged: (newMode: ItemViewMode) => void;
  onPressCreateNewSet: () => void;
}

export class Footer extends React.Component<FooterProps, {}> {
  render() {
    const { baseClass, readonly, itemViewMode, onModeChanged, isReordering, canReorder } = this.props;

    return (
      <div className={`${baseClass}__footer`}>
        {isReordering && canReorder ? <ReorderConfirmation {...this.props} /> : null}
        <div className={`${baseClass}__footer-buttons`} role="group">
          <ItemViewModeSwitch baseClass={baseClass} mode={itemViewMode} onModeChanged={onModeChanged} />
          {!readonly && canReorder ? <ReorderItemsButton {...this.props} /> : null}
          <div className={`${baseClass}__footer-spacer`}></div>
          {readonly ? null : this.renderAddNewSetButton()}
        </div>
      </div>
    );
  }

  private renderAddNewSetButton() {
    return (
      <div className="btn-group btn-group-xs" role="group">
        {!this.props.readonly && (
          <button
            type="button"
            title="Create new set"
            className="btn btn-default"
            onClick={this.props.onPressCreateNewSet}
          >
            <i className="fa fa-plus"></i>&nbsp;
            <i className="fa fa-folder fa-lg"></i>
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
      <div className={`btn-group btn-group-xs ${baseClass}__toggle-reorder-items`} role="group">
        <button
          type="button"
          title="Reorder items"
          aria-pressed={isReordering}
          className={classnames({ 'btn btn-default': true, active: isReordering })}
          onClick={onPressReorder}
        >
          <i className="fa fa-lg fa-random"></i>
        </button>
      </div>
    );
  }
}

export class ReorderConfirmation extends React.Component<ReorderingProps, {}> {
  render() {
    const { baseClass, onPressReorder, onPressReorderApply } = this.props;
    return (
      <div className={`${baseClass}__footer-reorder-confirmation`}>
        <div className={`${baseClass}__footer-reorder-message`}>Drag items to reorder</div>
        <div className={`${baseClass}__footer-reorder-buttons`}>
          <button
            type="button"
            title="Cancel reordering items"
            className={`btn btn-xs btn-default ${baseClass}__footer-reorder-cancel`}
            onClick={onPressReorder}
          >
            Cancel
          </button>
          <button
            type="button"
            title="Save items order"
            className="btn btn-xs btn-success"
            onClick={onPressReorderApply}
          >
            Save changes
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
    const className = `${baseClass}__item-view-mode btn-group btn-group-xs`;
    return (
      <div className={className} role="group">
        {this.renderModeButton('grid', 'Switch to grid view', <span className="fa fa-lg fa-th" />)}
        {this.renderModeButton('list', 'Switch to list view', <span className="fa fa-lg fa-th-list" />)}
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
        className={classnames({ 'btn btn-default': true, active: isPressed })}
        aria-pressed={isPressed}
        onClick={isPressed ? undefined : () => this.props.onModeChanged(mode)}
      >
        {children}
      </button>
    );
  }
}
