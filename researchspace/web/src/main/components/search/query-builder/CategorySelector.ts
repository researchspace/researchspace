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
 */

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as classnames from 'classnames';
import * as _ from 'lodash';
import ReactSelect from 'react-select';

import { TemplateItem } from 'platform/components/ui/template';
import { Category, Categories } from 'platform/components/semantic/search/data/profiles/Model';

export interface CategorySelectorProps {
  mode: 'stack' | 'dropdown'
  tupleTemplate: string
  entities: Categories
  selectedElement: Data.Maybe<Category>
  actions: {
    onValueChange: (clas: Category) => void;
  }
}

interface CategorySelectorState {
  isDisabled: {
    [entityIri: string]: boolean
  }
}

export class CategorySelectorComponent extends Component<
  CategorySelectorProps, CategorySelectorState
> {

  constructor(props: CategorySelectorProps, context: any) {
    super(props, context);
    this.state = {
      isDisabled: {},
    };
  }

  componentDidMount() {
    // hack to workaround delayed template rendering
    _.delay(this.updateDisabledItems, 1000, 'later');
  }

  componentDidUpdate() {
    _.delay(this.updateDisabledItems, 1000, 'later');
  }

  render() {
    return this.props.mode === 'dropdown'
      ? this.renderCategoryDropdown()
      : this.renderCategoryButtons();
  }

  private renderCategoryButtons() {
    const fcButtons =
        this.props.entities.map(
          entity => {
            const isSelectedElement = this.props.selectedElement.map(
              selected => entity.iri.value === selected.iri.value
            ).getOrElse(false);
            return D.li(
              {key: entity.iri.value},
              createElement(TemplateItem, {
                ref: entity.iri.value,
                componentProps: {
                  disabled: this.state.isDisabled[entity.iri.value] == true,
                  className: classnames({
                    'btn': true,
                    'btn-default': true,
                    'category-item-holder': true,
                    'category-item-holder--active': isSelectedElement,
                  }),
                  title: entity.label,
                  'data-rdfa-about': entity.iri.value,
                  onClick: (event) => {
                    if (this.hasDisabledChild(event.currentTarget) == false) {
                      event.currentTarget.blur();
                      this.props.actions.onValueChange(entity);
                    }
                  },
                },
                template: {
                  source: this.props.tupleTemplate,
                  options: entity.tuple,
                },
              })
            );
          }
        );
    return D.ol({
      className: 'category-selector',
    }, fcButtons.toArray());
  }

  private renderCategoryDropdown() {
    const selectedCategory = this.props.selectedElement.map(category => {
      const selectedIri = category.iri.value;
      return this.props.entities.find(c => c.iri.value === selectedIri);
    }).getOrElse(null);

    return createElement(ReactSelect, {
      className: 'category-selector',
      placeholder: 'Select category',
      value: selectedCategory,
      options: this.props.entities.toArray(),
      optionRenderer: (entity: Category) => {
        const isSelectedElement = selectedCategory &&
          entity.iri.value === selectedCategory.iri.value;
        return createElement(TemplateItem, {
          key: entity.iri.value,
          ref: entity.iri.value,
          template: {
            source: this.props.tupleTemplate,
            options: entity.tuple,
          },
          componentProps: {
            disabled: this.state.isDisabled[entity.iri.value] == true,
            className: classnames({
              'btn': true,
              'btn-default': true,
              'category-item-holder': true,
              'category-item-holder--active': isSelectedElement,
            }),
            title: entity.label,
            'data-rdfa-about': entity.iri.value,
          }
        });
      },
      onChange: (selected: Category) => {
        if (selected && selected !== selectedCategory) {
          this.props.actions.onValueChange(selected);
        } else if (!selected && selectedCategory) {
          // select same value to toggle off category
          this.props.actions.onValueChange(selectedCategory);
        }
      },
    });
  }

  private updateDisabledItems = () => {
    const disabled =
        _.reduce(
          this.refs,
          (acc, ref, key) => {
            acc[key] = this.hasDisabledChild(
              findDOMNode(ref) as HTMLElement
            );
            return acc;
          }, {}
        );

    if (_.isEqual(disabled, this.state.isDisabled) == false) {
      this.setState({
        isDisabled: <any>disabled,
      });
    }
  }

  private hasDisabledChild(elem: HTMLElement): boolean {
    return _.some(
      elem.children, c => c['dataset']['disabled'] == 'true'
    );
  }
}

export const CategorySelector = createFactory(CategorySelectorComponent);
export default CategorySelector;
