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
import { ReactElement } from 'react';
import * as Immutable from 'immutable';
import * as classnames from 'classnames';

import { ClearableInput, AutoCompletionInput} from 'platform/components/ui/inputs';

import { KeywordFilter, SetFilter } from '../Configuration';
import { FilterValue } from '../SetsModel';

export interface Props {
  baseClass: string;
  keywordFilter: KeywordFilter;
  setIsOpen: boolean;
  minInputLength: number;
  filters: SetFilter[];
  searchText?: string;
  /**
   * Determines content of additional filters panel.
   * When collection is undefined filters panel would be hidden.
   */
  filterValues?: Immutable.List<FilterValue>;
  onSearchTextChanged: (searchText: string) => void;
  onFilterChanged: (filterValues: Immutable.List<FilterValue> | undefined) => void;
}

export class SearchAndFilters extends React.Component<Props, {}> {
  private showAdditionalFilters() {
    return Boolean(this.props.filterValues);
  }

  render() {
    const {baseClass, minInputLength, searchText, filters} = this.props;
    return <div className={`${baseClass}__search-and-filters`}>
      {this.renderKeywordSearch(filters.length > 0)}
      {(searchText && searchText.length < minInputLength) ?
        <div key='search-message' className={`${baseClass}__search-message`}>
          {`Minimum length of search term is ${minInputLength} characters.`}
        </div> : undefined}
      <div key='filters-and-badges' className={classnames({
        [`${baseClass}__filters`]: true,
        [`${baseClass}__filters--hidden`]: !this.showAdditionalFilters(),
      })}>
        <div key='filters'>{filters.map((filter, index) => this.renderFilter(filter, index))}</div>
      </div>
    </div>;
  }

  private renderKeywordSearch(hasFilters: boolean) {
    const {baseClass} = this.props;
    const placeholder = this.props.keywordFilter.placeholder;
    const {placeholderInSet = placeholder} = this.props.keywordFilter;
    return <div key='keyword-search' className={`${baseClass}__search`}>
      <ClearableInput className={`${baseClass}__search-input`}
        value={this.props.searchText || ''}
        placeholder={this.props.setIsOpen ? placeholderInSet : placeholder}
        onChange={e => this.props.onSearchTextChanged(e.currentTarget.value)}
        onClear={() => this.props.onSearchTextChanged('')}
      />
      <button className={classnames({
          [`${baseClass}__show-filters`]: true,
          'btn btn-default': true,
          'active': this.showAdditionalFilters(),
        })}
        aria-pressed={this.showAdditionalFilters()}
        style={{display: hasFilters ? undefined : 'none'}}
        onClick={() => {
          if (this.showAdditionalFilters()) {
            this.props.onFilterChanged(undefined);
          } else {
            this.props.onFilterChanged(Immutable.List<FilterValue>());
          }
        }}>
        <span className='fa fa-ellipsis-v' title='Show additional filters'></span>
      </button>
    </div>;
  }

  private renderFilter(filter: SetFilter, index: number): ReactElement<any> {
    const {baseClass, filterValues = Immutable.List<FilterValue>()} = this.props;
    return <div key={index} className={`${baseClass}__filter`}>
      <AutoCompletionInput
        placeholder={filter.placeholder}
        query={filter.suggestionsQuery}
        defaultQuery={filter.suggestionsQuery}
        minimumInput={this.props.minInputLength}
        value={
          filterValues
            .filter(fv => fv.filter === filter)
            .map(fv => fv.binding)
            .toArray()
        }
        multi={true}
        actions={{
          onSelected: bindings => {
            if (bindings && Array.isArray(bindings)) {
              const newFilterValues = filterValues
                .filter(fv => fv.filter !== filter)
                .toList()
                .push(...bindings.map(
                  binding => ({filter, binding}),
                ));
              this.props.onFilterChanged(newFilterValues);
            }
          },
        }}
      />
    </div>;
  }
}
