/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import type { Page } from '@playwright/test';

/** Inspect SVG/CSS semantics without putting multi-megabyte font data in failures. */
export async function inspectExportedDiagram(page: Page, source: string) {
  return page.evaluate(svg => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const primaryFamily = (value: string) =>
      (/^\s*(?:"([^"]*)"|'([^']*)'|([^,]+))/.exec(value)?.slice(1).find(Boolean) ?? '').trim().toLowerCase();
    const fontFaces: {family: string; embedded: boolean; payloadLength: number}[] = [];
    for (const style of document.querySelectorAll('style[data-rs-export-fonts]')) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(style.textContent ?? '');
      for (const rule of sheet.cssRules) {
        if (!(rule instanceof CSSFontFaceRule)) { continue; }
        // CSSOM accepts quoted and unquoted URLs; formatting is not a contract.
        const urls = [...rule.style.getPropertyValue('src')
          .matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)]
          .map(match => match[1] ?? match[2] ?? match[3]);
        fontFaces.push({
          family: primaryFamily(rule.style.getPropertyValue('font-family')),
          embedded: urls.length > 0 && urls.every(url => /^data:[^,]+;base64,/.test(url)),
          payloadLength: urls.reduce((size, url) => size + (url.split(',')[1]?.length ?? 0), 0),
        });
      }
    }
    const icons = [...document.querySelectorAll<HTMLElement>('.resource-card__icon-container i')].map(icon => ({
      text: icon.textContent?.trim() ?? '',
      family: primaryFamily(icon.style.fontFamily),
      variations: icon.style.getPropertyValue('font-variation-settings'),
    }));
    const titles = [...document.querySelectorAll<HTMLElement>('.resource-card__footer-title')].map(title => ({
      text: title.textContent?.trim() ?? '', family: primaryFamily(title.style.fontFamily),
    }));
    return {
      parseError: document.querySelector('parsererror')?.textContent ?? null,
      fontFaces, icons, titles,
      headerActions: document.querySelectorAll('.resource-card__header-actions').length,
    };
  }, source);
}
