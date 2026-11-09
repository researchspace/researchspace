/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useCamera, useSigma } from '@react-sigma/core';

interface SearchMatch {
  id: string;
  label: string;
}
interface SearchState {
  query: string;
  selected: string | null;
  matches: SearchMatch[];
}
const emptySearch = (): SearchState => ({ query: '', selected: null, matches: [] });

/** Search a graph whose nodes may be added, replaced or removed during exploration. */
export const GraphSearchControl: React.FC = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const { gotoNode } = useCamera();
  const [inputId] = useState(() => 'sigma-search-' + Math.random().toString(36).slice(2));
  const [search, setSearch] = useState<SearchState>(emptySearch);

  const readSearch = useCallback(
    (query: string, selectExact: boolean, previousSelection: string | null = null): SearchState => {
      const term = query.trim();
      if (!term) return { query, selected: null, matches: [] };
      const lowerTerm = term.toLowerCase();
      const matches: SearchMatch[] = [];
      let selected: string | null = null;
      // Read the current graph, never trust a previously rendered datalist item.
      graph.forEachNode((id, attributes) => {
        const label = attributes.label;
        if (typeof label !== 'string' || !label.trim()) return;
        if (term.length > 1 && label.toLowerCase().includes(lowerTerm)) matches.push({ id, label });
        if (label === term && (selectExact || id === previousSelection) && selected === null) selected = id;
      });
      return { query, selected, matches: selected === null ? matches : [] };
    },
    [graph]
  );
  const clearSearch = useCallback(() => setSearch(emptySearch()), []);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      // A single expansion can insert many nodes. Refresh suggestions once at
      // the end of that batch, and never on x/y updates from a layout worker.
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        setSearch((previous) => readSearch(previous.query, false, previous.selected));
      }, 0);
    };
    const onDrop = ({ key }: { key: string }) => {
      setSearch((previous) => (previous.selected === key ? { ...previous, selected: null } : previous));
      refresh();
    };
    const onClear = () => {
      setSearch((previous) => ({ ...previous, selected: null, matches: [] }));
      refresh();
    };
    graph.on('nodeAdded', refresh);
    graph.on('nodeDropped', onDrop);
    graph.on('cleared', onClear);
    sigma.on('clickStage', clearSearch);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      graph.off('nodeAdded', refresh);
      graph.off('nodeDropped', onDrop);
      graph.off('cleared', onClear);
      sigma.off('clickStage', clearSearch);
    };
  }, [graph, sigma, readSearch, clearSearch]);

  useEffect(() => {
    const node = search.selected;
    if (node === null || !graph.hasNode(node)) return;
    graph.setNodeAttribute(node, 'highlighted', true);
    // An attribute listener can remove/replace a group while it is highlighted.
    if (graph.hasNode(node)) gotoNode(node);
    return () => {
      // Expansion/group cleanup may have removed this node since selection.
      if (graph.hasNode(node)) graph.setNodeAttribute(node, 'highlighted', false);
    };
  }, [graph, search.selected, gotoNode]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      // Enter belongs to this search input, including when it is empty. Do not
      // submit an enclosing form or invoke a page-level keyboard shortcut.
      event.preventDefault();
      event.stopPropagation();
      setSearch(readSearch(event.currentTarget.value, true));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      clearSearch();
    }
  };

  return (
    <div className="react-sigma-search">
      <label htmlFor={inputId} style={{ display: 'none' }}>
        Search a node
      </label>
      <input
        id={inputId}
        type="text"
        placeholder="Search..."
        autoComplete="off"
        list={`${inputId}-datalist`}
        value={search.query}
        onChange={(event) => setSearch(readSearch(event.target.value, true))}
        onKeyDown={onKeyDown}
      />
      <datalist id={`${inputId}-datalist`}>
        {search.matches.map(({ id, label }) => (
          <option key={id} value={label}>
            {label}
          </option>
        ))}
      </datalist>
    </div>
  );
};

export default GraphSearchControl;
