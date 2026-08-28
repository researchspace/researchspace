/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { readFile } from 'node:fs/promises';

import { type Page, type Locator, type Download, expect } from '@playwright/test';
import { sel, toolbar } from './selectors';
import { EntityForm } from './EntityForm';
import { KmEntityCard } from './KmEntityCard';

const KM_PATH = '/resource/ThinkingFrames?view=knowledge-map';

export interface CreateEntityOptions {
  name: string;
  /** Element-type label to create; defaults to the first constructible type. */
  type?: string;
  /** Upload a main image as part of creation. */
  image?: { name: string; file: string };
  /** Optional absolute screen position. */
  at?: { x: number; y: number };
}

/** The knowledge-map authoring view: open/save the map and author entities. */
export class KnowledgeMap {
  private canvasBox?: { x: number; y: number; width: number; height: number };
  private placed = 0;
  private _diagramIri?: string;

  private constructor(readonly page: Page) {}

  /** Open a brand-new (unsaved) knowledge map. */
  static async openNew(page: Page): Promise<KnowledgeMap> {
    const km = new KnowledgeMap(page);
    await page.goto(KM_PATH);
    await km.waitLoaded();
    return km;
  }

  /** Open an existing knowledge map by its diagram IRI. */
  static async open(page: Page, diagramIri: string): Promise<KnowledgeMap> {
    const km = new KnowledgeMap(page);
    km._diagramIri = diagramIri;
    await page.goto(`${KM_PATH}&resource=${encodeURIComponent(diagramIri)}`);
    await km.waitLoaded();
    return km;
  }

  get canvas(): Locator {
    return this.page.locator(sel.km.canvas);
  }

  get diagramIri(): string | undefined {
    return this._diagramIri;
  }

  get saveDataButton(): Locator {
    return this.page.getByRole('button', { name: toolbar.saveDataLabel, exact: true }).filter({ hasText: toolbar.saveDataLabel });
  }

  get saveMapButton(): Locator {
    return this.page.getByRole('button', { name: toolbar.saveMapLabel, exact: true }).filter({ hasText: toolbar.saveMapLabel });
  }

  get dragHandle(): Locator {
    return this.page.locator(sel.km.dragHandle);
  }

  async waitLoaded(): Promise<void> {
    await expect(this.canvas).toBeVisible();
    await expect(this.saveMapButton).toBeVisible();
    this.canvasBox = (await this.canvas.boundingBox()) ?? undefined;
  }

  /** Reload the current map from the server. */
  async reopen(): Promise<void> {
    if (this._diagramIri) {
      await KnowledgeMap.open(this.page, this._diagramIri);
    } else {
      await this.page.reload();
      await this.waitLoaded();
    }
    this.placed = 0;
  }

  async openClassPanel(): Promise<void> {
    const createBtn = this.page.locator(sel.km.classCreateButton).first();
    if (!(await createBtn.isVisible().catch(() => false))) {
      await this.page.locator(sel.km.leftPanelExpand).click();
      await createBtn.waitFor({ state: 'visible' });
    }
  }

  private async nodeIds(): Promise<string[]> {
    return this.page.locator(sel.km.anyNode).evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-element-id')!).filter(Boolean));
  }

  private nextSlot(): { x: number; y: number } {
    const box = this.canvasBox ?? { x: 320, y: 150, width: 900, height: 500 };
    const i = this.placed++;
    return { x: box.x + 180 + (i % 3) * 300, y: box.y + 170 + Math.floor(i / 3) * 240 };
  }

  async createEntity(opts: CreateEntityOptions): Promise<KmEntityCard> {
    await this.openClassPanel();
    const before = await this.nodeIds();

    if (opts.type) {
      await this.page.locator(sel.km.classFilter).fill(opts.type);
      await this.page.locator(sel.km.classRow, { hasText: opts.type }).first()
        .locator(sel.km.classCreateButton).click();
    } else {
      await this.page.locator(sel.km.classCreateButton).first().click();
    }

    const form = await new EntityForm(this.page).waitOpen();
    await form.setName(opts.name);
    if (opts.image) await form.setImage(opts.image);
    await form.save();

    const after = await this.nodeIds();
    const id = after.find((x) => !before.includes(x));
    const card = new KmEntityCard(this.page, { id, name: opts.name });

    const at = opts.at ?? this.nextSlot();
    await card.moveTo(at.x, at.y);
    return card;
  }

  entity(name: string): KmEntityCard {
    return new KmEntityCard(this.page, { name });
  }

  /** Search persisted instances from the class panel. */
  async searchInstances(text: string): Promise<string[]> {
    await this.openClassPanel();
    await this.page.locator(sel.km.instancesSearchInput).fill(text);
    await this.page.locator(sel.km.instancesSearchSubmit).first().click();
    const items = this.page.locator(sel.km.searchResultItem);
    await expect(items.first()).toBeVisible({ timeout: 20_000 });
    return items.allTextContents();
  }

  async expectEntity(name: string): Promise<void> {
    await expect(this.page.locator(sel.km.anyNode).filter({ hasText: name })).toBeVisible();
  }

  async expectEntityHighlighted(name: string): Promise<void> {
    await expect(this.entity(name).locator).not.toHaveClass(/reactodia-overlaid-element--blurred/);
  }

  async expectEntityDimmed(name: string): Promise<void> {
    await expect(this.entity(name).locator).toHaveClass(/reactodia-overlaid-element--blurred/);
  }

  async expectNoSearchHighlight(): Promise<void> {
    await expect(this.page.locator(sel.km.blurredNode)).toHaveCount(0);
    await expect(this.page.locator(sel.km.blurredLink)).toHaveCount(0);
  }

  async groupEntities(cards: KmEntityCard[]): Promise<string> {
    if (cards.length < 2) throw new Error('groupEntities: at least two cards are required');
    const before = await this.elementIds(sel.km.groupNode);

    await cards[0].select();
    for (const card of cards.slice(1)) await card.select({ additive: true });

    const action = this.page.locator(sel.km.groupAction).first();
    await expect(action).toBeVisible();
    await action.click();
    await expect.poll(() => this.page.locator(sel.km.groupNode).count()).toBe(before.length + 1);

    const after = await this.elementIds(sel.km.groupNode);
    const id = after.find((candidate) => !before.includes(candidate));
    if (!id) throw new Error('groupEntities: no new group element appeared');
    return id;
  }

  async annotateElement(elementId: string): Promise<string> {
    const before = await this.elementIds(sel.km.annotationNode);
    const node = this.page.locator(sel.km.node(elementId));
    const box = await node.boundingBox();
    if (!box) throw new Error('annotateElement: target has no bounding box');
    await node.click({ position: { x: box.width / 2, y: 12 } });

    const action = this.page.locator(sel.km.annotateAction).first();
    await expect(action).toBeVisible();
    await action.click();
    await expect.poll(() => this.page.locator(sel.km.annotationNode).count()).toBe(before.length + 1);

    const after = await this.elementIds(sel.km.annotationNode);
    const id = after.find((candidate) => !before.includes(candidate));
    if (!id) throw new Error('annotateElement: no new annotation appeared');
    return id;
  }

  async editAnnotation(elementId: string, text: string): Promise<void> {
    const annotation = this.page.locator(sel.km.node(elementId));
    await annotation.locator('.reactodia-note-annotation').dblclick();
    const editor = annotation.locator(sel.km.annotationEditor);
    await expect(editor).toHaveAttribute('contenteditable', 'plaintext-only');
    await editor.fill(text);
    await editor.press('Escape');
    await expect(annotation).toContainText(text);
  }

  async ungroupEntity(name: string): Promise<void> {
    const group = this.page.locator(sel.km.groupNode).filter({ hasText: name });
    const item = group.locator('.reactodia-standard-element__item').filter({ hasText: name });
    await item.hover();
    await item.locator(sel.km.ungroupAction).click();
    await expect(group).toHaveCount(0);
  }

  async deleteFirstLink(): Promise<void> {
    await this.page.locator(sel.km.link).first().click({ force: true });
    const action = this.page.locator(sel.km.deleteLinkAction).first();
    await expect(action).toBeEnabled({ timeout: 30_000 });
    await action.focus();
    await action.press('Enter');
    await expect(this.saveDataButton).toBeEnabled();
  }

  async expectGroupContaining(names: string[]): Promise<void> {
    const group = this.page.locator(sel.km.groupNode).filter({ hasText: names[0] });
    await expect(group).toHaveCount(1);
    for (const name of names) await expect(group).toContainText(name);
  }

  async expectAnnotation(text = 'Annotation'): Promise<void> {
    await expect(this.page.locator(sel.km.annotationNode).filter({ hasText: text })).toBeVisible();
  }

  async annotationLinkCount(): Promise<number> {
    return this.page.locator(sel.km.annotationLink).count();
  }

  async linkCount(): Promise<number> {
    return this.page.locator(sel.km.link).count();
  }

  private async elementIds(selector: string): Promise<string[]> {
    return this.page.locator(selector).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-element-id')!).filter(Boolean));
  }

  async saveData(): Promise<void> {
    await expect(this.saveDataButton).toBeEnabled();
    await this.saveDataButton.click();
    await expect(this.saveDataButton).toBeDisabled({ timeout: 30_000 });
  }

  async saveMapAs(name: string): Promise<string> {
    await expect(this.saveMapButton).toBeEnabled();
    await this.saveMapButton.click();
    const dialog = this.page.getByRole('dialog', { name: sel.saveMapModal.dialogName });
    await dialog.getByPlaceholder(sel.saveMapModal.namePlaceholder).fill(name);
    const created = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/container') && r.status() < 400,
      { timeout: 30_000 },
    );
    await dialog.getByRole('button', { name: sel.saveMapModal.saveButton, exact: true }).click();
    this._diagramIri = (await created).headers()['location'];
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    if (!this._diagramIri) throw new Error('saveMapAs: no Location header for created diagram');
    return this._diagramIri;
  }

  async saveMap(): Promise<void> {
    if (!this._diagramIri) throw new Error('saveMap: map has not been created');
    const saved = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/container?repository=assets') &&
        response.status() < 400,
      { timeout: 30_000 },
    );
    await this.saveMapButton.click();
    await saved;
  }

  async undo(): Promise<void> {
    const button = this.page.getByTitle(new RegExp(`^${toolbar.undoTitle}`));
    await expect(button).toBeEnabled();
    await button.click();
  }

  async redo(): Promise<void> {
    const button = this.page.getByTitle(new RegExp(`^${toolbar.redoTitle}`));
    await expect(button).toBeEnabled();
    await button.click();
  }

  async clearAll(): Promise<void> {
    await this.page.getByTitle('Clear all').click();
    await expect(this.page.locator(sel.km.anyNode)).toHaveCount(0);
  }

  private async exportDiagram(format: 'SVG' | 'PNG'): Promise<Download> {
    await this.page.locator('#export-diagram-button').click();
    const download = this.page.waitForEvent('download');
    await this.page.getByRole('menuitem', { name: `Export as ${format}` }).click();
    const result = await download;
    await expect.poll(() => result.failure()).toBeNull();
    return result;
  }

  async exportSvg(): Promise<string> {
    return (await this.exportDiagram('SVG')).suggestedFilename();
  }

  async exportPng(): Promise<string> {
    return (await this.exportDiagram('PNG')).suggestedFilename();
  }

  /** Exports as SVG and returns the downloaded file contents. */
  async exportSvgSource(): Promise<string> {
    const download = await this.exportDiagram('SVG');
    const file = await download.path();
    return readFile(file, 'utf8');
  }
}
