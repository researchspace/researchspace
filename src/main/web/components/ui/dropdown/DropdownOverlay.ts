/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { AnchoredMenuOverlay, AnchoredMenuOptions } from './AnchoredMenuOverlay';

/** Bootstrap focuses an item before the parent commit can promote the menu. */
export function preserveOpeningScroll(root: HTMLElement): () => void {
  const scroll: Array<{ element: HTMLElement; left: number; top: number }> = [];
  for (let element = root; element; element = element.parentElement) {
    scroll.push({ element, left: element.scrollLeft, top: element.scrollTop });
  }
  return () => scroll.forEach(({ element, left, top }) => {
    element.scrollLeft = left;
    element.scrollTop = top;
  });
}

/** One open dropdown session, including lazy menu content and wrapped actions. */
export class DropdownOverlay {
  private menu: HTMLElement | undefined;
  private overlay: AnchoredMenuOverlay | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private contentObserver: MutationObserver;
  private frame: number | undefined;
  private disposed = false;

  constructor(private readonly root: HTMLElement, private readonly onClose: () => void,
      private readonly options: AnchoredMenuOptions = {}, private readonly menuSelector = '.dropdown-menu') {
    window.addEventListener('resize', this.schedulePosition);
    window.addEventListener('scroll', this.schedulePosition, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.schedulePosition);
      window.visualViewport.addEventListener('scroll', this.schedulePosition);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.schedulePosition);
      for (let node: Element = root; node; node = node.parentElement) this.resizeObserver.observe(node);
    }
    this.contentObserver = new MutationObserver(this.schedulePosition);
    this.contentObserver.observe(root, { childList: true, characterData: true, subtree: true });
  }

  schedulePosition = () => {
    if (this.disposed || this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.position();
    });
  };

  position() {
    if (this.disposed) return;
    const menu = this.root.querySelector<HTMLElement>(this.menuSelector);
    const trigger = this.root.querySelector<HTMLElement>('.dropdown-toggle');
    if (menu !== this.menu) {
      this.releaseMenu();
      if (menu) {
        this.menu = menu;
        this.overlay = new AnchoredMenuOverlay(menu, this.options);
        menu.addEventListener('click', this.onClick);
        menu.addEventListener('keydown', this.onKeyDown, true);
        if (this.resizeObserver) this.resizeObserver.observe(menu);
      }
    }
    if (this.overlay && trigger && !this.overlay.position(trigger)) {
      // Closing must not focus an off-screen trigger and scroll back to it.
      const focused = document.activeElement as HTMLElement;
      if (focused && menu.contains(focused)) focused.blur();
      this.onClose();
    } else if (this.overlay && menu.contains(document.activeElement) &&
        (document.activeElement as Element).closest('.disabled, [aria-disabled="true"]')) {
      // Bootstrap 0.33 can initially focus a disabled item on keyboard opening.
      const first = this.enabledItems()[0];
      if (first) first.focus({ preventScroll: true });
    }
  }

  private enabledItems(): HTMLElement[] {
    return Array.from(this.menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .filter(item => !item.closest('.disabled, [aria-disabled="true"]') && item.getClientRects().length);
  }

  private closeAfterAction(menu: HTMLElement) {
    // Allow selection/export/dialog handlers to run before dismissing the menu.
    Promise.resolve().then(() => {
      if (!this.disposed && menu === this.menu) this.onClose();
    });
  }

  private onClick = (event: MouseEvent) => {
    const item = (event.target as Element).closest('[role="menuitem"]');
    if (item && !item.closest('.disabled, [aria-disabled="true"]')) this.closeAfterAction(this.menu);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      this.closeAfterAction(this.menu);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.root.querySelector<HTMLElement>('.dropdown-toggle').focus({ preventScroll: true });
      this.onClose();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) ||
        (event.target as Element).closest('input, textarea, select, [contenteditable="true"]')) return;
    const items = this.enabledItems();
    if (!items.length) return;
    // Action wrappers do not forward Bootstrap's injected keyboard handlers.
    event.preventDefault();
    event.stopPropagation();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
      event.key === 'ArrowDown' ? (index + 1) % items.length : (index <= 0 ? items.length - 1 : index - 1);
    const item = items[next];
    item.focus({ preventScroll: true });
    const bounds = this.menu.getBoundingClientRect(), rect = item.getBoundingClientRect();
    if (rect.top < bounds.top) this.menu.scrollTop -= bounds.top - rect.top;
    else if (rect.bottom > bounds.bottom) this.menu.scrollTop += rect.bottom - bounds.bottom;
  };

  private releaseMenu() {
    if (this.menu) {
      this.menu.removeEventListener('click', this.onClick);
      this.menu.removeEventListener('keydown', this.onKeyDown, true);
      if (this.resizeObserver) this.resizeObserver.unobserve(this.menu);
    }
    if (this.overlay) this.overlay.dispose();
    this.menu = undefined;
    this.overlay = undefined;
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('resize', this.schedulePosition);
    window.removeEventListener('scroll', this.schedulePosition, true);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.schedulePosition);
      window.visualViewport.removeEventListener('scroll', this.schedulePosition);
    }
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.contentObserver.disconnect();
    this.releaseMenu();
  }
}
