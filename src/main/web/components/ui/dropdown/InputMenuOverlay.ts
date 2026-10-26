/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { AnchoredMenuOverlay } from './AnchoredMenuOverlay';

/** Position a picker without replacing its own selection, focus or keyboard handling. */
export class InputMenuOverlay {
  private menu: HTMLElement;
  private overlay: AnchoredMenuOverlay;
  private resizeObserver: ResizeObserver;
  private contentObserver: MutationObserver;
  private frame: number;
  private disposed = false;

  constructor(private readonly root: HTMLElement, private readonly triggerSelector: string,
      private readonly menuSelector: string, private readonly onHidden: () => void) {
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
    // React Select calls onOpen before committing the menu to the DOM.
    this.schedulePosition();
  }

  private schedulePosition = () => {
    if (this.disposed || this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.position();
    });
  };

  position() {
    if (this.disposed) return;
    const menu = this.root.querySelector<HTMLElement>(this.menuSelector);
    const trigger = this.root.querySelector<HTMLElement>(this.triggerSelector);
    if (menu !== this.menu) {
      this.releaseMenu();
      if (menu) {
        this.menu = menu;
        this.overlay = new AnchoredMenuOverlay(menu, {
          width: 320, matchTriggerWidth: true, align: 'start', maxHeight: 360, overflow: 'hidden',
        });
        if (this.resizeObserver) this.resizeObserver.observe(menu);
      }
    }
    if (this.overlay && trigger && !this.overlay.position(trigger)) this.onHidden();
  }

  private releaseMenu() {
    if (this.menu && this.resizeObserver) this.resizeObserver.unobserve(this.menu);
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
