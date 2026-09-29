/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

interface FontFaceSource {
  readonly style: CSSStyleDeclaration;
  readonly baseUrl: string;
}

/** Embed the actual text and icon fonts, including imported and grouped faces. */
export async function embedExportFonts(target: SVGElement, families: ReadonlySet<string>): Promise<void> {
  const document_ = target.ownerDocument;
  const faces = (await collectFontFaces(document_)).filter(face =>
    families.has(normalizeFamily(face.style.getPropertyValue('font-family')))
  );
  // A loaded web font without a discovered face would silently fall back in
  // the exported image. Reject that case rather than export icon-name text.
  const foundFamilies = new Set(faces.map(face => normalizeFamily(face.style.getPropertyValue('font-family'))));
  for (const family of families) {
    if (/^material (symbols|icons)( |$)/.test(family) && !foundFamilies.has(family)) {
      throw new Error(`Cannot export icon font ${family}: no readable @font-face rule. Check stylesheet CORS access.`);
    }
  }
  document_.fonts.forEach(font => {
    const family = normalizeFamily(font.family);
    if (font.status === 'loaded' && families.has(family) && !foundFamilies.has(family)) {
      throw new Error(`Cannot export font ${font.family}: no readable @font-face rule. Check stylesheet CORS access.`);
    }
  });
  const downloads = new Map<string, Promise<string>>();
  const rules: string[] = [];
  const seen = new Set<string>();
  for (const face of faces) {
    // Prefer WOFF2 but retain other URL alternatives if it is unavailable.
    const sources = fontUrls(face.style.getPropertyValue('src'), face.baseUrl);
    if (!sources.length) {
      throw new Error(`Cannot export font ${face.style.getPropertyValue('font-family')}: no embeddable font URL.`);
    }
    let embedded: string | undefined;
    for (const url of sources) {
      try {
        let download = downloads.get(url);
        if (!download) {
          download = fontDataUri(url);
          downloads.set(url, download);
        }
        embedded = await download;
        break;
      } catch { /* Try the next font format before reporting a failed export. */ }
    }
    if (!embedded) {
      throw new Error(`Cannot export font ${face.style.getPropertyValue('font-family')}: font files could not be loaded.`);
    }
    // Preserve weight ranges, Unicode subsets and metric overrides. The font
    // itself handles ligature aliases, FILL/wght/GRAD/opsz and glyph outlines.
    const descriptors: string[] = [];
    for (let i = 0; i < face.style.length; i++) {
      const property = face.style[i];
      if (property !== 'src' && property !== 'font-display') {
        descriptors.push(`${property}:${face.style.getPropertyValue(property)}`);
      }
    }
    descriptors.push(`src:url("${embedded}")`, 'font-display:block');
    const rule = `@font-face{${descriptors.join(';')}}`;
    if (!seen.has(rule)) {
      seen.add(rule);
      rules.push(rule);
    }
  }
  if (rules.length) {
    const style = document_.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('data-rs-export-fonts', '');
    style.textContent = rules.join('\n');
    target.insertBefore(style, target.firstChild);
  }
}

export function addFontFamilies(value: string, families: Set<string>): void {
  // Commas inside a quoted family name are not list separators.
  for (const match of value.matchAll(/(?:[^,"']|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g)) {
    const family = normalizeFamily(match[0]);
    if (family) families.add(family);
  }
}

function normalizeFamily(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '').toLowerCase();
}

async function collectFontFaces(document_: Document): Promise<FontFaceSource[]> {
  const faces: FontFaceSource[] = [];
  const visited = new Set<CSSStyleSheet>();
  const fetched = new Set<string>();
  const window_ = document_.defaultView!;
  const visitRules = async (rules: CSSRuleList, baseUrl: string): Promise<void> => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        faces.push({style: (rule as CSSFontFaceRule).style, baseUrl});
      } else if (rule.type === CSSRule.IMPORT_RULE) {
        const imported = rule as CSSImportRule;
        if (!imported.media.length || window_.matchMedia(imported.media.mediaText).matches) {
          if (imported.styleSheet) await visitSheet(imported.styleSheet, baseUrl);
          else await visitUrl(new URL(imported.href, baseUrl).href);
        }
      } else {
        if (rule.type === CSSRule.MEDIA_RULE && !window_.matchMedia((rule as CSSMediaRule).conditionText).matches) continue;
        if (rule.type === CSSRule.SUPPORTS_RULE && !window_.CSS.supports((rule as CSSSupportsRule).conditionText)) continue;
        const nested = (rule as CSSGroupingRule).cssRules;
        if (nested) await visitRules(nested, baseUrl);
      }
    }
  };
  const visitUrl = async (url: string): Promise<void> => {
    if (fetched.has(url)) return;
    fetched.add(url);
    try {
      // A cross-origin <link> without crossorigin can render normally while
      // cssRules throws SecurityError. Refetch only through ordinary CORS;
      // webpack's dev asset server already permits these GET requests.
      const response = await fetch(url, {mode: 'cors'});
      if (!response.ok) throw new Error(`Stylesheet download failed: ${response.status}`);
      if (/text\/html|application\/json/i.test(response.headers.get('content-type') || '')) {
        throw new Error('Expected CSS but received an HTML or JSON response');
      }
      // Use the browser's CSS parser in an inert document. No rules affect the
      // live UI, and imports can be resolved explicitly against the source URL.
      // Constructable stylesheets would discard @import rules during parsing.
      const parsedDocument = document_.implementation.createHTMLDocument('');
      const style = parsedDocument.createElement('style');
      style.textContent = await response.text();
      parsedDocument.head.appendChild(style);
      if (!style.sheet) throw new Error('Could not parse font stylesheet');
      await visitRules(style.sheet.cssRules, response.url || url);
    } catch (error) {
      // Without the stylesheet's rules we cannot establish which font faces
      // are needed. Do not silently export without their definitions.
      throw new Error(`Cannot read export stylesheet ${url}. Check its URL, response and CORS access. ${String(error)}`);
    }
  };
  const visitSheet = async (sheet: CSSStyleSheet, inheritedBase: string): Promise<void> => {
    if (visited.has(sheet) || sheet.disabled) return;
    if (sheet.media.length && !window_.matchMedia(sheet.media.mediaText).matches) return;
    visited.add(sheet);
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch {
      if (sheet.href) await visitUrl(sheet.href);
      return;
    }
    await visitRules(rules, sheet.href || inheritedBase);
  };
  for (const sheet of Array.from(document_.styleSheets)) await visitSheet(sheet, document_.baseURI);
  return faces;
}

function fontUrls(source: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
  for (const match of source.matchAll(pattern)) {
    const url = new URL(match[1] ?? match[2] ?? match[3], baseUrl).href;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls.sort((a, b) => Number(!/\.woff2(?:[?#]|$)|^data:font\/woff2/i.test(a)) - Number(!/\.woff2(?:[?#]|$)|^data:font\/woff2/i.test(b)));
}

async function fontDataUri(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
