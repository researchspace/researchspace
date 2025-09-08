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
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import './DropdownWithFilter.scss';

/**
 * Props for DropdownWithFilter.
 *
 * @template T - The type of each item in the dropdown list. T can be any object or primitive; you provide a getLabel function to extract a string label from each item.
 */
interface DropdownWithFilterProps<T> {
  /**
   * Unique id for the dropdown root element.
   */
  id: string;
  /**
   * The button label or content for the dropdown toggle.
   */
  title: React.ReactNode;
  /**
   * The array of items to display in the dropdown.
   */
  items: T[];
  /**
   * The current value of the filter input.
   */
  filterValue: string;
  /**
   * Callback when the filter input changes.
   */
  onFilterChange: (value: string) => void;
  /**
   * Callback when an item is selected.
   */
  onSelect: (item: T) => void;
  /**
   * Function to extract the display label from an item.
   */
  getLabel: (item: T) => string;
  /**
   * Optional placeholder for the filter input.
   */
  placeholder?: string;
  /**
   * Optional text to display when no items match the filter.
   */
  noResultsText?: string;
}


/**
 * DropdownWithFilter
 * ------------------
 * A reusable, generic dropdown component with a filter input, styled for React-Bootstrap v3.
 *
 * Renders a dropdown menu with a filterable list of items.
 *
 *
 * @example
 * <DropdownWithFilter
 *   id="my-dropdown"
 *   title="Select Item"
 *   items={[{ label: 'A' }, { label: 'B' }]}
 *   filterValue={filterValue}
 *   onFilterChange={setFilterValue}
 *   onSelect={item => alert(item.label)}
 *   getLabel={item => item.label}
 *   placeholder="Filter..."
 *   noResultsText="No items found"
 * />
 */
export function DropdownWithFilter<T>({
  id,
  title,
  items,
  filterValue,
  onFilterChange,
  onSelect,
  getLabel,
  placeholder,
  noResultsText
}: DropdownWithFilterProps<T>) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const filtered = !filterValue
    ? items
    : items.filter(item => getLabel(item).toLowerCase().includes(filterValue.toLowerCase()));

  const handleToggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next && inputRef.current) {
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
      return next;
    });
  };

  const handleSelect = (item: T) => {
    setOpen(false);
    onSelect(item);
    onFilterChange('');
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown dropdown-with-filter${open ? ' open' : ''}`}
      id={id}
    >
      <button
        type="button"
        className="btn btn-default dropdown-toggle"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {title} <span className="caret" />
      </button>
      {open && (
        <ul className="dropdown-menu pull-right">
          <li className="dropdown-filter-input">
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder || 'Filter...'}
              className="form-control"
              value={filterValue}
              onChange={e => onFilterChange(e.target.value)}
              autoComplete="off"
            />
          </li>
          {filtered.length > 0 ? (
            filtered.map(item => (
              <li role="menuitem" key={getLabel(item)}>
                <a
                  href="#"
                  tabIndex={-1}
                  className="dropdown-item"
                  onClick={e => { e.preventDefault(); handleSelect(item); }}
                >
                  {getLabel(item)}
                </a>
              </li>
            ))
          ) : (
            <li><span className="dropdown-no-results">{noResultsText || 'No results'}</span></li>
          )}
        </ul>
      )}
    </div>
  );
}
