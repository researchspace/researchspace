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

/**
 * @author Mike Kelly <mkelly@britishmuseum.org>
 */

const h = require('history');

import { BrowserPersistence } from 'platform/api/persistence';

const BH_RECENT_PAGES = 'recentPages';
const MAX_BH_RECENT_QUERIES = 12;
let recentPages = BrowserPersistence.getItem(BH_RECENT_PAGES);
if (!recentPages || recentPages.toArray().length === 0) {
  recentPages = [];
} else {
  recentPages = recentPages.toArray();
}

/**
 * Persistent History
 *
 * Use MemoryHistory from the 'history' API to store page changes
 * and persist them to the browser, for use in BrowseHistoryComponent
 */

export const MemoryHistory = h.createMemoryHistory({
  initialEntries: recentPages,
  initialIndex: 0,
});

export function init(init, notifyAll) {
  MemoryHistory.listen((location, action) =>
    init(location).onValue((mUrl) => mUrl.map((url) => notifyAll({ url: url, action: action })))
  );
}

export function clearPersistedRecentPages() {
  const noPages = [];
  BrowserPersistence.setItem(BH_RECENT_PAGES, noPages);
}

export function persistRecentPages(newUrl: string): void {
  let memoryEntries = MemoryHistory.entries.map((entry) => entry.pathname + entry.search);
  if (memoryEntries.find((entry) => entry === newUrl) === undefined) {
    MemoryHistory.push(newUrl);
  } else {
    MemoryHistory.entries.push(
      MemoryHistory.entries.splice(
        MemoryHistory.entries.findIndex((entry) => entry.pathname + entry.search === newUrl),
        1
      )[0]
    );
  }

  let pages = MemoryHistory.entries.map((location) => location.pathname + location.search);
  if (pages.length > MAX_BH_RECENT_QUERIES) {
    pages.pop();
  }
  BrowserPersistence.setItem(BH_RECENT_PAGES, pages);
}

export function resetMemoryHistory() {
  MemoryHistory.entries = [];
}
