/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { addFontFamilies } from './ExportFonts';

const TEXT_PROPERTIES = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
  'font-variation-settings', 'font-feature-settings', 'font-kerning',
  'font-optical-sizing', 'font-variant', 'font-synthesis',
  'line-height', 'letter-spacing', 'word-spacing', 'text-rendering',
  'text-align', 'text-decoration', 'text-transform', 'color',
];

// Reactodia's CSS collector does not retain every stylesheet context and may
// serialize unset custom properties as empty values, disabling var() fallbacks.
// Resolve card styles in the export DOM while it still has access to the page's
// stylesheets. Literal inline values then survive standalone SVG/PNG rendering.
const CARD_PROPERTIES = [
  'display', 'position', 'box-sizing', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'background-color', 'background-image', 'background-size', 'background-position',
  'background-repeat', 'background-clip', 'color', 'box-shadow',
  ...TEXT_PROPERTIES, 'white-space', 'word-break',
  '-webkit-line-clamp', '-webkit-box-orient', 'line-clamp',
  'overflow-wrap', 'text-overflow', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-self', 'justify-content', 'order', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'object-fit', 'object-position', 'transform', 'transform-origin',
  'opacity', 'visibility', 'fill', 'stroke', 'stroke-width',
];

/** Resolve card layout and all exported text; return the font families needed. */
export function inlineExportCardStyles(target: SVGElement): ReadonlySet<string> {
  const families = new Set<string>();
  const cards = Array.from(target.querySelectorAll('.resource-card'));

  const document_ = target.ownerDocument;
  const window_ = document_.defaultView;
  if (!document_.body || !window_) return families;

  const elements = new Set<Element>();
  for (const card of cards) {
    elements.add(card);
    for (const child of Array.from(card.querySelectorAll('*'))) elements.add(child);
    // The card is absolute-positioned against its sized wrapper. That wrapper
    // must retain its positioning even when the containing stylesheet is absent.
    for (let parent = card.parentElement; parent && parent !== (target as Element); parent = parent.parentElement) {
      if (parent.classList.contains('reactodia-exported-layer')) break;
      elements.add(parent);
      if (parent.classList.contains('reactodia-overlaid-element')) break;
    }
  }

  const host = document_.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Opacity on the host hides it without making the captured visibility hidden.
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const originalParent = target.parentNode;
  const nextSibling = target.nextSibling;
  try {
    document_.body.appendChild(host);
    host.appendChild(target);
    // Read every value before writing any: freezing an ancestor's dimensions
    // must not alter how a later child's percentage dimensions are resolved.
    // Include link labels and other text outside resource cards. Their inherited
    // typography must also survive the move into a standalone SVG document.
    const textElements = new Set(Array.from(target.querySelectorAll('*')).filter(element =>
      element.tagName.toLowerCase() !== 'style' && Array.from(element.childNodes).some(node =>
        node.nodeType === 3 && Boolean(node.textContent?.trim())
      )
    ));
    const allElements = new Set([...elements, ...textElements]);
    const snapshots = Array.from(allElements, element => {
      const computed = window_.getComputedStyle(element);
      if (textElements.has(element)) addFontFamilies(computed.fontFamily, families);
      let properties = elements.has(element) ? CARD_PROPERTIES : TEXT_PROPERTIES;
      // Explicit used heights on a line-clamped element or its children prevent
      // Chromium from propagating the clamp, replacing an ellipsis with a crop.
      // Keep their natural text layout inside the already-sized card/footer.
      if (element.closest('.text-truncate-line1')) {
        properties = properties.filter(name => name !== 'height' && name !== 'width');
      }
      const values = properties.map(name => [name, computed.getPropertyValue(name)]);
      // Chromium exposes a legacy clamped -webkit-box as flow-root. Replaying
      // that computed display disables the clamp even when its other properties
      // are retained, so keep the box syntax for this specific legacy case.
      if (computed.display === 'flow-root' &&
          parseInt(computed.getPropertyValue('-webkit-line-clamp'), 10) > 0 &&
          computed.getPropertyValue('-webkit-box-orient') === 'vertical') {
        const display = values.find(([name]) => name === 'display');
        if (display) display[1] = '-webkit-box';
      }
      return {element, values};
    });
    for (const {element, values} of snapshots) {
      const style = (element as HTMLElement | SVGElement).style;
      if (!style) continue;
      for (const [name, value] of values) {
        if (value) style.setProperty(name, value, 'important');
      }
    }
  } finally {
    if (originalParent) originalParent.insertBefore(target, nextSibling);
    else target.remove();
    host.remove();
  }
  return families;
}
