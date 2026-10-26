/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { findDOMNode } from 'react-dom';
import ReactSelect from 'react-select';
import { InputMenuOverlay } from '../dropdown/InputMenuOverlay';

/** React Select 1.x owns selection and listbox scrolling; only its placement changes. */
export function openSelectMenu(select: ReactSelect): InputMenuOverlay {
  return new InputMenuOverlay(findDOMNode(select) as HTMLElement, '.Select-control', '.Select-menu-outer', () => {
    // closeMenu is available in React Select 1.x but absent from its declarations.
    (select as ReactSelect & { closeMenu(): void }).closeMenu();
  });
}
