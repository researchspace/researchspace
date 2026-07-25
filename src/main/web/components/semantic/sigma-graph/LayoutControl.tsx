/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { MdAccountTree, MdPlayArrow, MdStop } from 'react-icons/md';

import {
  GraphLayoutName,
  isWorkerGraphLayout,
  useGraphLayout,
} from './GraphLayoutContext';

export interface LayoutControlProps {
  menuPlacement?: 'left' | 'right';
}

/**
 * Compact layout controller designed to live in the same ControlsContainer as
 * ZoomControl. The square toolbar button opens a small flyout rather than
 * widening the entire Sigma control stack.
 */
export const LayoutControl: React.FC<LayoutControlProps> = ({
  menuPlacement = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectId] = useState(
    () => `sigma-graph-layout-${Math.random().toString(36).slice(2)}`
  );
  const {
    selectedLayout,
    setSelectedLayout,
    applyLayout,
    stopAllWorkerLayouts,
    selectedLayoutIsRunning,
    layoutOptions,
  } = useGraphLayout();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeWhenClickingOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeWhenClickingOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const selectedIsWorker = isWorkerGraphLayout(selectedLayout);

  return (
    <div ref={rootRef} className="graph-layout-control">
      <div className="react-sigma-control">
        <button
          type="button"
          title={`Layout: ${selectedLayout}`}
          aria-label="Choose graph layout"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <MdAccountTree />
        </button>
      </div>

      {isOpen && (
        <div
          className={`graph-layout-control__menu graph-layout-control__menu--${menuPlacement}`}
          role="dialog"
          aria-label="Graph layout controls"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <label htmlFor={selectId}>Layout</label>
          <select
            id={selectId}
            className="form-control input-sm"
            value={selectedLayout}
            onChange={(event) =>
              setSelectedLayout(event.target.value as GraphLayoutName)
            }
          >
            {layoutOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="graph-layout-control__actions">
            <button
              type="button"
              className="btn btn-default btn-sm"
              onClick={() => applyLayout(selectedLayout)}
              title={selectedIsWorker ? 'Start or restart layout' : 'Apply layout'}
            >
              <MdPlayArrow aria-hidden="true" />
              <span>
                {selectedIsWorker
                  ? selectedLayoutIsRunning
                    ? 'Restart'
                    : 'Start'
                  : 'Apply'}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-default btn-sm"
              disabled={!selectedIsWorker || !selectedLayoutIsRunning}
              onClick={stopAllWorkerLayouts}
              title="Stop layout"
            >
              <MdStop aria-hidden="true" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutControl;
