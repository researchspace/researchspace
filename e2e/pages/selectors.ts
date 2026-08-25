/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const sel = {
  login: {
    username: 'input[name="username"]',
    password: 'input[name="password"]',
    submit: 'input[type="submit"][value="Login"]',
  },
  km: {
    canvas: '.reactodia-canvas',
    leftPanelExpand: '.reactodia-accordion-item__handle-btn-left',
    node: (id: string) => `[data-element-id="${id}"]`,
    anyNode: '[data-element-id]',
    link: '[data-link-id]',
    classFilter: 'input[name="reactodia-class-tree-filter"]',
    classRow: '.reactodia-class-tree-item__row',
    classCreateButton: '.reactodia-class-tree-item__create-button',
    instancesSearchInput: 'input[name="reactodia-instances-search-text"]',
    instancesSearchSubmit: '.reactodia-instances-search .reactodia-search-input__submit',
    searchResultItem: '.reactodia-list-element-view',
    establishLink: '.reactodia-selection-action__establish-link',
    groupAction: '.reactodia-selection-action__group',
    annotateAction: '.reactodia-selection-action__annotate',
    editAction: '.reactodia-authoring-state__action-edit',
    deleteAction: '.reactodia-authoring-state__action-delete',
    deleteLinkAction: '.reactodia-link-action__delete',
    ungroupAction: '.reactodia-standard-element__ungroup-one-button',
    groupNode: '[data-element-id]:has(.reactodia-standard-element--group)',
    annotationNode: '[data-element-id]:has(.reactodia-note-annotation)',
    annotationEditor: '.reactodia-note-annotation__editor',
    annotationLink: '[data-link-id]:has(.reactodia-note-link__path)',
    blurredNode: '.reactodia-overlaid-element--blurred',
    blurredLink: '.reactodia-link--blurred',
    dragHandle: '[data-testid="knowledge-map-drag-handle"]',
  },
  clipboard: {
    tab: '.flexlayout__border_button:has-text("Clipboard")',
    root: '.set-management',
    set: '.set-management__set',
    setCaption: '.set-management__set-caption',
    openedSet: '.set-management__opened-set',
    item: '.set-management__set-item',
    searchInput: '.set-management__search-input input',
  },
  form: {
    dialog: '.reactodia-dialog',
    close: '.reactodia-dialog__close-button',
    nameInput: 'input[placeholder="Enter name/appellation"]',
    submit: 'button[name="submit"]',
    reset: 'button[name="reset"]',
    mainImageField: '.dragAndDrop-input-container[for*="main_image"]',
    uploadLink: '.text-link',
    placeholder: '.placeholder-item',
  },
  imageModal: {
    root: '.modal',
    title: '.modal-title',
    nameInput: 'input[placeholder="Enter image name"]',
    fileInput: 'input[type="file"]',
  },
  connectDialog: {
    caption: 'Create new connection',
    typeSelect: 'select[name="reactodia-link-type-selector-select"]',
  },
  saveMapModal: {
    dialogName: 'Save Map',
    namePlaceholder: 'Enter map name',
    saveButton: 'Save',
  },
} as const;

export const toolbar = {
  saveDataLabel: 'Save data',
  saveMapLabel: 'Save Map',
  undoTitle: 'Undo',
  redoTitle: 'Redo',
} as const;
