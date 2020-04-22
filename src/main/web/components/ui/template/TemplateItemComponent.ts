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

import { createElement, Fragment } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ModuleRegistry } from 'platform/api/module-loader';

/**
 * This component render custom html elements.
 * It takes inner html, parses it into the react element and then renders the result inside.
 *
 * It is useful when one wants to render platform template with some 3-rd party component
 * that expects plain HTML as an input,
 * like annotation popover in Mirador, or feature popover in openlayers.
 *
 * This component is registered as `mp-template-item` web component in the `app.ts` file.
 */
export class TemplateItemComponent extends HTMLElement {

  private root: HTMLElement;

  connectedCallback() {
    // this is ugly hack to workaround issue with event propagation when react root
    // is inside custom web component,
    // see https://github.com/facebook/react/issues/9242
    const shadow = this.attachShadow({ mode: 'open' }) as any;
    this.root = document.createElement('div');
    shadow.appendChild(this.root);

    Object.defineProperty(this.root, 'ownerDocument', { value: shadow });
    shadow.createElement = (...args: any) => (document as any).createElement(...args);
    shadow.createElementNS = (...args: any) => (document as any).createElementNS(...args);
    shadow.createTextNode = (...args: any) => (document as any).createTextNode(...args);

    ModuleRegistry.parseHtmlToReact(this.innerHTML).then(
      res => {
        // we need to use Fragment here because res can be a single element or array of elements
        // see https://reactjs.org/docs/fragments.html
        render(createElement(Fragment, {}, res), this.root);
      }
    );
  }

  disconnectedCallback() {
    unmountComponentAtNode(this.root);
  }
}
