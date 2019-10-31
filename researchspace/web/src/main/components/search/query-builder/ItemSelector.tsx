/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 */

import * as React from 'react';
import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import * as classnames from 'classnames';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import ReactSelect from 'react-select';

import { TemplateItem } from 'platform/components/ui/template';

import { Resource, Resources } from 'platform/components/semantic/search/data/search/Model';
import * as styles from './ItemSelector.scss';

export interface Props {
  mode: 'stack' | 'dropdown'
  tupleTemplate: string
  resources: Resources
  className?: string
  itemClassName?: string
  label: string
  actions: {
    selectResource: (resource: Resource) => void;
  }
}

interface StackSelectorState {
  focusedOption: Data.Maybe<Resource>
}

class StackSelector extends Component<Props, StackSelectorState> {
  refs: {
    [key: string]: HTMLElement
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      focusedOption: Maybe.Nothing<Resource>(),
    };
  }

  componentDidMount() {
    this.setState({focusedOption: Maybe.fromNullable(this.props.resources.first())});
  }

  componentDidUpdate() {
    this.state.focusedOption.map(option => this.refs[option.iri.value].focus());
  }

  render() {
    const { tupleTemplate, className, resources, actions, itemClassName, label } = this.props;
    const fcButtons =
      resources.map(
        resource =>
          <li key={resource.iri.value} ref={resource.iri.value}
              className={classnames('btn', styles.itemHolder, itemClassName)}
              tabIndex={0}
              aria-label={resource.label} role='option'
              onMouseOver={() => this.focusItem(resource)}
              onClick={(event) => this.props.actions.selectResource(resource)}
          >
            {renderResource(tupleTemplate, resource, actions.selectResource)}
          </li>
      );
    return <ul role='listbox' tabIndex={0} aria-label={label}
               onKeyDown={this.handleKeyDown}
               className={classnames(styles.itemSelector, className)}>{fcButtons.toArray()}</ul>;
  }

  private focusItem = (resource: Resource) => {
    this.setState({focusedOption: Maybe.Just(resource)});
  }

  private handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    switch (event.keyCode) {
      case 13: // enter
        this.state.focusedOption.map(this.props.actions.selectResource);
        break;
      case 38: // up
        this.focusPreviousOption();
        break;
      case 40: // down
        this.focusNextOption();
        break;
      case 9: // tab
        this.focusNextOption();
        break;
    }
    event.preventDefault();
  }

  private focusNextOption = () => {
    this.setState(state => ({
      focusedOption : state.focusedOption.map(
        option => {
          const optionsSeq = this.props.resources.keySeq();
          const focusedIndex = optionsSeq.indexOf(option.iri);
          const newIndex = focusedIndex + 1;
          const newKey = optionsSeq.size === newIndex
            ? optionsSeq.first() : optionsSeq.get(newIndex);
          return this.props.resources.get(newKey);
        }
      ),
    }));
  }

   private focusPreviousOption = () => {
    this.setState(state => ({
      focusedOption : state.focusedOption.map(
        option => {
          const optionsSeq = this.props.resources.keySeq();
          const focusedIndex = optionsSeq.indexOf(option.iri);
          const newIndex = focusedIndex - 1;
          const newKey = optionsSeq.size === 0
            ? optionsSeq.get(optionsSeq.size - 1) : optionsSeq.get(newIndex);
          return this.props.resources.get(newKey);
        }
      ),
    }));
  }
}

class DropdownSelector extends Component<Props, {}> {
  render() {
    const {tupleTemplate, className, resources, actions, itemClassName} = this.props;
    return (
      <ReactSelect
        ref={this.onSelectMounted}
        className={classnames(styles.itemSelector, styles.dropdown, className)}
        autofocus={true}
        openOnFocus={true}
        value={null}
        options={resources.toArray()}
        optionRenderer={(resource: Resource) => renderResource(
          tupleTemplate, resource, actions.selectResource, itemClassName)}
        onChange={(resource: Resource) => actions.selectResource(resource)}
      />
    );
  }

  private onSelectMounted = (select: any) => {
    if (select) {
      const node = findDOMNode(select) as Element;
      node.setAttribute('aria-label', this.props.label);
    }
  }
}

export function renderResource(
  template: string, resource: Resource, onClick: (resource: Resource) => void, className?: string
) {
  // make tuple as well as resource props available in template
  const options = _.assign({}, resource.tuple, resource);
  return React.createElement(TemplateItem, {
    template: {
      source: template,
      options: options,
    },
    componentProps: {
      className: className
    },
  });
}

export class ItemSelector extends Component<Props, {}> {
  render() {
    return this.props.mode === 'dropdown'
      ? <DropdownSelector {...this.props} />
      : <StackSelector {...this.props} />;
  }
}

export default ItemSelector;
