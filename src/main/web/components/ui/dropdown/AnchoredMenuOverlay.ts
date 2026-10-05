/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
export interface AnchoredMenuOptions {
  /** Preferred width in CSS pixels; omit to keep the menu's themed width. */
  width?: number;
  matchTriggerWidth?: boolean;
  align?: 'start' | 'end';
  viewportMargin?: number;
  gap?: number;
  maxHeight?: number;
  /** Pickers scroll their inner list while keeping search and action controls visible. */
  overflow?: 'auto' | 'hidden';
}

/** Places an existing menu without moving its DOM or React/template context. */
export class AnchoredMenuOverlay {
  private readonly originalStyle: string | null;
  private readonly originalPopover: string | null;
  private readonly maximumHeight: number;
  private readonly nativePopover: boolean;

  constructor(private readonly menu: HTMLElement, private readonly options: AnchoredMenuOptions = {}) {
    this.originalStyle = menu.getAttribute('style');
    this.originalPopover = menu.getAttribute('popover');
    this.maximumHeight = options.maxHeight || parseFloat(getComputedStyle(menu).maxHeight) || 400;
    this.nativePopover = typeof menu.showPopover === 'function';
    menu.style.margin = '0';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    menu.style.overflow = options.overflow || 'auto';
    menu.style.overscrollBehavior = 'contain';
    if (this.nativePopover) {
      menu.style.position = 'fixed';
      menu.setAttribute('popover', 'manual');
      menu.showPopover();
    }
  }

  /** False means the trigger has left its visible scroll area. */
  position(trigger: HTMLElement): boolean {
    const menu = this.menu;
    const anchor = trigger.getBoundingClientRect();
    if (!trigger.isConnected || !trigger.getClientRects().length) return false;

    const viewport = window.visualViewport;
    const margin = this.options.viewportMargin === undefined ? 8 : this.options.viewportMargin;
    const gap = this.options.gap === undefined ? 4 : this.options.gap;
    const left = (viewport ? viewport.offsetLeft : 0) + margin;
    const top = (viewport ? viewport.offsetTop : 0) + margin;
    const right = left + (viewport ? viewport.width : document.documentElement.clientWidth) - 2 * margin;
    const bottom = top + (viewport ? viewport.height : document.documentElement.clientHeight) - 2 * margin;
    const visible = { left, top, right, bottom };
    for (let node = trigger.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const xScale = node.offsetWidth ? rect.width / node.offsetWidth : 1;
      const yScale = node.offsetHeight ? rect.height / node.offsetHeight : 1;
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        visible.left = Math.max(visible.left, rect.left + node.clientLeft * xScale);
        visible.right = Math.min(visible.right, rect.left + (node.clientLeft + node.clientWidth) * xScale);
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        visible.top = Math.max(visible.top, rect.top + node.clientTop * yScale);
        visible.bottom = Math.min(visible.bottom, rect.top + (node.clientTop + node.clientHeight) * yScale);
      }
    }
    if (anchor.right <= visible.left || anchor.left >= visible.right ||
        anchor.bottom <= visible.top || anchor.top >= visible.bottom) return false;

    // Native top-layer menus can cross the form or table boundary. Older browsers keep
    // a bounded in-place menu, fitted inside all clipping ancestors instead.
    const bounds = this.nativePopover ? { left, top, right, bottom } : visible;
    let scaleX = 1;
    let scaleY = 1;
    let parent: HTMLElement;
    let parentRect: DOMRect;
    if (!this.nativePopover) {
      parent = menu.offsetParent as HTMLElement;
      if (!parent) return false;
      parentRect = parent.getBoundingClientRect();
      scaleX = parent.offsetWidth ? parentRect.width / parent.offsetWidth : 1;
      scaleY = parent.offsetHeight ? parentRect.height / parent.offsetHeight : 1;
      if (!scaleX || !scaleY) return false;
    }

    const availableWidth = Math.max(0, bounds.right - bounds.left) / scaleX;
    menu.style.maxWidth = `${availableWidth}px`;
    if (this.options.width !== undefined || this.options.matchTriggerWidth) {
      const preferredWidth = Math.max(this.options.width || 0,
        this.options.matchTriggerWidth ? anchor.width / scaleX : 0);
      menu.style.minWidth = '0';
      menu.style.width = `${Math.min(preferredWidth, availableWidth)}px`;
    }
    const below = Math.max(0, bounds.bottom - anchor.bottom - gap);
    const above = Math.max(0, anchor.top - bounds.top - gap);
    const borders = menu.offsetHeight - menu.clientHeight;
    const wanted = Math.min(this.maximumHeight, menu.scrollHeight + borders) * scaleY;
    const upwards = below < wanted && above > below;
    const space = upwards ? above : below;
    menu.style.maxHeight = `${Math.min(this.maximumHeight, space / scaleY)}px`;
    const size = menu.getBoundingClientRect();
    const preferredLeft = this.options.align === 'start' ? anchor.left : anchor.right - size.width;
    const x = Math.max(bounds.left, Math.min(preferredLeft, bounds.right - size.width));
    const y = upwards ? anchor.top - gap - size.height : anchor.bottom + gap;
    menu.style.left = `${this.nativePopover ? x : (x - parentRect.left) / scaleX - parent.clientLeft + parent.scrollLeft}px`;
    menu.style.top = `${this.nativePopover ? y : (y - parentRect.top) / scaleY - parent.clientTop + parent.scrollTop}px`;
    return true;
  }

  dispose() {
    if (this.nativePopover && this.menu.matches(':popover-open')) this.menu.hidePopover();
    if (this.originalPopover === null) this.menu.removeAttribute('popover');
    else this.menu.setAttribute('popover', this.originalPopover);
    if (this.originalStyle === null) this.menu.removeAttribute('style');
    else this.menu.setAttribute('style', this.originalStyle);
  }
}
