/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as Reactodia from '@reactodia/workspace';

import { getBaseUrl } from 'platform/api/http';

// An exported diagram cannot load an external font, so material icons — which
// are font ligatures — have nothing to render with. Reactodia embeds the text
// fonts on its own; the icon font is far too big for that (4 MB for the
// variable Material Symbols), so each icon is replaced by the shipped icon SVG.

const ICON_SELECTOR = '[class*="material-icons"],[class*="material-symbols"]';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Already hidden by the export stylesheet, so drop the nodes instead of
// resolving SVGs for icons nobody sees.
const HIDDEN_IN_EXPORT: ReadonlyArray<string> = ['.resource-card__header-actions'];

// Icon class -> Material Symbols style directory. Keep in sync with the
// directories copied by webpack/copyIconSvgs.js.
const ICON_SVG_DIRS: { readonly [iconClass: string]: string } = {
  'material-symbols-rounded': 'rounded',
};

// Icon names come from the data, so they are checked before going into a URL.
const ICON_NAME = /^[a-z0-9_]+$/;

interface IconSvg {
  readonly viewBox: string;
  readonly paths: ReadonlyArray<string>;
}

export function exportDiagramSvg(
  canvas: Reactodia.CanvasApi,
  options: { addXmlHeader?: boolean } = {}
): Promise<string> {
  return canvas.exportSvg({
    removeByCssSelectors: HIDDEN_IN_EXPORT,
    transformExported: inlineIconGlyphs,
    addXmlHeader: options.addXmlHeader,
  });
}

export function exportDiagramPng(
  canvas: Reactodia.CanvasApi,
  options: { backgroundColor?: string } = {}
): Promise<string> {
  return canvas.exportRaster({
    removeByCssSelectors: HIDDEN_IN_EXPORT,
    transformExported: inlineIconGlyphs,
    backgroundColor: options.backgroundColor,
  });
}

async function inlineIconGlyphs(target: SVGElement): Promise<void> {
  for (const icon of Array.from(target.querySelectorAll(ICON_SELECTOR))) {
    const name = (icon.textContent ?? '').trim();
    if (!name) {
      continue;
    }

    const dir = iconSvgDir(icon);
    const iconSvg = dir ? await loadIconSvg(dir, name) : undefined;
    if (iconSvg) {
      replaceWithSvg(icon, iconSvg);
    } else {
      // Blank rather than leave the ligature name showing. The comment keeps
      // the element from serializing as `<i/>`, an open tag to the print
      // window's HTML parser.
      icon.textContent = '';
      icon.appendChild(icon.ownerDocument.createComment(` ${name} `));
    }
  }
}

function iconSvgDir(icon: Element): string | undefined {
  for (const iconClass of (icon.getAttribute('class') ?? '').split(/\s+/)) {
    if (ICON_SVG_DIRS[iconClass]) {
      return ICON_SVG_DIRS[iconClass];
    }
  }
  return undefined;
}

const iconSvgCache = new Map<string, Promise<IconSvg | undefined>>();

function loadIconSvg(dir: string, name: string): Promise<IconSvg | undefined> {
  const key = `${dir}/${name}`;
  let iconSvg = iconSvgCache.get(key);
  if (!iconSvg) {
    iconSvg = fetchIconSvg(key);
    iconSvgCache.set(key, iconSvg);
  }
  return iconSvg;
}

async function fetchIconSvg(key: string): Promise<IconSvg | undefined> {
  const [, name] = key.split('/');
  if (!ICON_NAME.test(name)) {
    return undefined;
  }
  try {
    const response = await fetch(`${getBaseUrl() ?? ''}/assets/material-symbols/${key}.svg`);
    if (!response.ok) {
      return undefined;
    }
    const parsed = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (parsed.getElementsByTagName('parsererror').length > 0) {
      return undefined;
    }
    const root = parsed.documentElement;
    const viewBox = root.getAttribute('viewBox');
    if (!viewBox) {
      return undefined;
    }
    const paths = Array.from(root.querySelectorAll('path'))
      .map(path => path.getAttribute('d'))
      .filter((d): d is string => Boolean(d));
    return paths.length > 0 ? {viewBox, paths} : undefined;
  } catch (err) {
    return undefined;
  }
}

// The wrapper has to stay: a card icon is sized by
// `.resource-card__icon-container i`, which matches it and not an svg.
function replaceWithSvg(icon: Element, iconSvg: IconSvg): void {
  const document_ = icon.ownerDocument;
  const svg = document_.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', iconSvg.viewBox);
  svg.setAttribute('fill', 'currentColor');
  // The view box is the glyph's em box, so a 1em block reproduces the font's
  // placement; block layout avoids an inline element's baseline shift.
  svg.setAttribute('style', 'display:block;width:1em;height:1em');
  for (const d of iconSvg.paths) {
    const path = document_.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  icon.textContent = '';
  icon.appendChild(svg);
}
