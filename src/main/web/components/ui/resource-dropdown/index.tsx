import * as React from 'react';
import { findDOMNode } from 'react-dom';
import { Dropdown } from 'react-bootstrap';
import Icon from '../../ui/icon/Icon';
import { FormMenuOverlay } from './FormMenuOverlay';

interface State {
  customDropdownOpen: boolean;
  dropdownOpen: boolean;
  customDropdownTemplate?: any;
}

interface Props {
  id: string;
  className?: string;
  toggleClassName?: string;
}

export class ResourceDropdown extends React.Component<Props, State> {
  private menuOpen = false;
  private positionFrame: number | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private contentObserver: MutationObserver | undefined;
  private formMenu: HTMLElement | undefined;
  private formOverlay: FormMenuOverlay | undefined;
  private openingScroll: Array<{ element: HTMLElement; left: number; top: number }> = [];

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { customDropdownOpen: false, dropdownOpen: false };
    this.onToggle = this.onToggle.bind(this);
  }

  onToggle(open: boolean) {
    this.menuOpen = open;
    this.stopPositioning();
    this.openingScroll = [];
    const root = findDOMNode(this) as HTMLElement;
    if (open && root && this.needsMenuOverlay(root)) {
      for (let element = root; element; element = element.parentElement) {
        this.openingScroll.push({ element, left: element.scrollLeft, top: element.scrollTop });
      }
    }
    // Keep lazy menu contents mounted, but close when their trigger scrolls away.
    this.setState({ customDropdownOpen: this.state.customDropdownOpen || open, dropdownOpen: open },
      () => { if (open) this.startPositioning(); });
  }

  componentDidUpdate() {
    if (this.menuOpen) this.schedulePosition();
  }

  componentWillUnmount() {
    this.menuOpen = false;
    this.stopPositioning();
  }

  private startPositioning = () => {
    if (!this.menuOpen) return;
    // Bootstrap 0.33 focuses the first item in its child commit, before our
    // opening callback can promote the menu. Undo only that opening scroll,
    // synchronously before paint; retain focus on the now-floating menu item.
    this.openingScroll.forEach(({ element, left, top }) => {
      element.scrollLeft = left;
      element.scrollTop = top;
    });
    this.openingScroll = [];
    const root = findDOMNode(this) as HTMLElement;
    const menu = root && root.querySelector<HTMLElement>('.resource-actions__dropdown-menu');
    if (!root || (menu && menu.classList.contains('resource-card__dropdown-km'))) return;
    window.addEventListener('resize', this.schedulePosition);
    window.addEventListener('scroll', this.schedulePosition, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.schedulePosition);
      window.visualViewport.addEventListener('scroll', this.schedulePosition);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.schedulePosition);
      // A splitter may resize a clipping ancestor without a viewport resize.
      for (let node: Element = root; node; node = node.parentElement) {
        this.resizeObserver.observe(node);
      }
    }
    this.contentObserver = new MutationObserver(this.schedulePosition);
    this.contentObserver.observe(root, { childList: true, subtree: true });
    // Position during the opening commit, before an in-flow menu can paint.
    this.positionMenu();
  };

  private stopPositioning = () => {
    window.removeEventListener('resize', this.schedulePosition);
    window.removeEventListener('scroll', this.schedulePosition, true);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.schedulePosition);
      window.visualViewport.removeEventListener('scroll', this.schedulePosition);
    }
    if (this.positionFrame !== undefined) cancelAnimationFrame(this.positionFrame);
    this.positionFrame = undefined;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.contentObserver) this.contentObserver.disconnect();
    this.resizeObserver = undefined;
    this.contentObserver = undefined;
    this.releaseFormMenu();
  };

  private releaseFormMenu() {
    if (this.formMenu) {
      this.formMenu.removeEventListener('click', this.onFormMenuClick);
      this.formMenu.removeEventListener('keydown', this.onFormMenuKeyDown, true);
    }
    if (this.formOverlay) this.formOverlay.dispose();
    this.formOverlay = undefined;
    this.formMenu = undefined;
  }

  private closeFormMenuAfterEvent(menu: HTMLElement) {
    // Wrapper actions (for example mp-overlay-dialog) do not forward Bootstrap's
    // onSelect. Let their own React handler run before dismissing the overlay.
    Promise.resolve().then(() => {
      if (this.menuOpen && this.formMenu === menu) this.onToggle(false);
    });
  }

  private onFormMenuClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const item = target.closest('[role="menuitem"]');
    if (item && !item.closest('.disabled, [aria-disabled="true"]')) {
      this.closeFormMenuAfterEvent(this.formMenu);
    }
  };

  private onFormMenuKeyDown = (event: KeyboardEvent) => {
    const menu = this.formMenu;
    if (event.key === 'Tab') {
      this.closeFormMenuAfterEvent(menu);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if ((event.target as Element).closest('input, textarea, select, [contenteditable="true"]')) return;
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .filter(item => !item.closest('.disabled, [aria-disabled="true"]') && item.getClientRects().length);
    if (!items.length) return;
    // Capture once for both direct MenuItems and items inside action wrappers;
    // those wrappers do not forward Bootstrap's injected onKeyDown either.
    event.preventDefault();
    event.stopPropagation();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length
      : (index <= 0 ? items.length - 1 : index - 1);
    const item = items[next];
    item.focus({ preventScroll: true });
    const bounds = menu.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    if (rect.top < bounds.top) menu.scrollTop -= bounds.top - rect.top;
    else if (rect.bottom > bounds.bottom) menu.scrollTop += rect.bottom - bounds.bottom;
  };

  private schedulePosition = () => {
    if (!this.menuOpen || this.positionFrame !== undefined) return;
    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = undefined;
      this.positionMenu();
    });
  };

  private positionMenu() {
    const root = findDOMNode(this) as HTMLElement;
    const card = root && root.closest('.resource-card');
    const menu = root && root.querySelector<HTMLElement>('.resource-actions__dropdown-menu');
    // Knowledge-map flyouts use their own placement and transformed canvas.
    if (!root || !menu || menu.classList.contains('resource-card__dropdown-km')) return;
    if (this.needsMenuOverlay(root)) {
      if (this.formMenu !== menu) {
        this.releaseFormMenu();
        this.formMenu = menu;
        this.formOverlay = new FormMenuOverlay(menu);
        menu.addEventListener('click', this.onFormMenuClick);
        menu.addEventListener('keydown', this.onFormMenuKeyDown, true);
        if (this.resizeObserver) this.resizeObserver.observe(menu);
      }
      const trigger = root.querySelector<HTMLElement>('.dropdown-toggle');
      if (trigger && !this.formOverlay.position(trigger)) {
        // Do not let Bootstrap focus an off-screen trigger and scroll back to it.
        const focused = document.activeElement as HTMLElement;
        if (focused && menu.contains(focused)) focused.blur();
        this.onToggle(false);
      }
      return;
    }
    if (!menu.offsetParent) return;
    const parent = menu.offsetParent as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const scale = parent.offsetWidth ? parentRect.width / parent.offsetWidth : 1;
    if (!scale) return;

    let left = 8;
    let right = document.documentElement.clientWidth - 8;
    for (let node = menu.parentElement; node; node = node.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX)) {
        const rect = node.getBoundingClientRect();
        const nodeScale = node.offsetWidth ? rect.width / node.offsetWidth : 1;
        left = Math.max(left, rect.left + (node.clientLeft + 4) * nodeScale);
        right = Math.min(right, rect.left + (node.clientLeft + node.clientWidth - 4) * nodeScale);
      }
    }
    if (right <= left) return;
    // Width remains themeable. Only its upper limit follows the visible panel.
    menu.style.maxWidth = `${(right - left) / scale}px`;
    const width = menu.getBoundingClientRect().width;
    const anchor = card || root;
    const anchorRect = anchor.getBoundingClientRect();
    const alignRight = !card || card.classList.contains('resource-card--row');
    const preferredLeft = alignRight ? anchorRect.right - width : anchorRect.left;
    const targetLeft = Math.max(left, Math.min(preferredLeft, right - width));
    menu.style.right = 'auto';
    menu.style.left = `${(targetLeft - parentRect.left) / scale - parent.clientLeft + parent.scrollLeft}px`;
  }

  private needsMenuOverlay(root: HTMLElement): boolean {
    return Boolean(root.closest('.DragAndDropInput--holder, .search-results-area .search-table-container'));
  }

  shouldComponentUpdate(nextProps: React.PropsWithChildren<Props>, nextState: State) {
    return (
      nextProps.id !== this.props.id ||
      nextProps.className !== this.props.className ||
      nextProps.toggleClassName !== this.props.toggleClassName ||
      nextProps.children !== this.props.children ||
      nextState.dropdownOpen !== this.state.dropdownOpen ||
      nextState.customDropdownOpen !== this.state.customDropdownOpen
    );
  }

  render() {
    const { id, className, toggleClassName, children } = this.props;
    return (
      <Dropdown id={id} className={className} pullRight open={this.state.dropdownOpen} onToggle={this.onToggle}>
        <Dropdown.Toggle className={toggleClassName} aria-label='Resource actions'>
          <Icon iconType='rounded' iconName='more_vert' symbol />
        </Dropdown.Toggle>
        {this.state.customDropdownOpen ? children : <Dropdown.Menu />}
      </Dropdown>
    );
  }
}

export default ResourceDropdown;
