/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as Reactodia from '@reactodia/workspace';

import { inlineExportCardStyles } from './ExportCardStyles';
import { embedExportFonts } from './ExportFonts';

const HIDDEN_IN_EXPORT: ReadonlyArray<string> = ['.resource-card__header-actions'];

export async function exportDiagramSvg(
  canvas: Reactodia.CanvasApi,
  options: { addXmlHeader?: boolean } = {}
): Promise<string> {
  await document.fonts.ready;
  return canvas.exportSvg({
    removeByCssSelectors: HIDDEN_IN_EXPORT,
    transformExported: prepareDiagramExport,
    embedFonts: false,
    addXmlHeader: options.addXmlHeader,
  });
}

export async function exportDiagramPng(
  canvas: Reactodia.CanvasApi,
  options: { backgroundColor?: string } = {}
): Promise<string> {
  await document.fonts.ready;
  return canvas.exportRaster({
    removeByCssSelectors: HIDDEN_IN_EXPORT,
    transformExported: prepareDiagramExport,
    embedFonts: false,
    backgroundColor: options.backgroundColor,
  });
}

async function prepareDiagramExport(target: SVGElement): Promise<void> {
  // Embed the installed fonts rather than substituting a different SVG icon
  // set. This preserves aliases and the live glyph's variation settings.
  const families = inlineExportCardStyles(target);
  await embedExportFonts(target, families);
}
