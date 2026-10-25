import * as React from 'react';
import { findDOMNode } from 'react-dom';
import { Dropdown } from 'react-bootstrap';
import { Component, TemplateContext } from 'platform/api/components';
import { CapturedContext } from 'platform/api/services/template';
import { ModuleRegistry } from 'platform/api/module-loader';
import Icon from '../../ui/icon/Icon';
import { DropdownOverlay, preserveOpeningScroll } from '../dropdown/DropdownOverlay';

interface State {
  customDropdownOpen: boolean;
  dropdownOpen: boolean;
  /** Menu rendered from `menuTemplate` on the first open. */
  menu?: React.ReactElement<any> | React.ReactElement<any>[];
  menuContext?: CapturedContext;
}

interface Props {
  id: string;
  className?: string;
  toggleClassName?: string;
  /**
   * Menu markup as a template reference (usually `{{> menu}}` with a
   * `<template id='menu'>` child) instead of inline children.
   *
   * Inline children are rendered by the surrounding template and parsed into
   * React elements for every row, card or knowledge-map node even though the
   * menu stays unmounted until it is first opened. A template child is kept
   * as source and is rendered only on the first open, which keeps large action
   * menus (rsp:ResourceDropdownActions) off the cost of listing resources.
   *
   * @example
   * <rs-resource-dropdown id='...' menu-template='{{> menu}}'>
   *   <template id='menu'>{{> rsp:ResourceDropdownActions iri=iri.value ...}}</template>
   * </rs-resource-dropdown>
   */
  menuTemplate?: string;
}

export class ResourceDropdown extends Component<Props, State> {
  private menuOpen = false;
  private positionFrame: number | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private contentObserver: MutationObserver | undefined;
  private overlay: DropdownOverlay | undefined;
  private restoreOpeningScroll: (() => void) | undefined;

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { customDropdownOpen: false, dropdownOpen: false };
    this.onToggle = this.onToggle.bind(this);
  }

  onToggle(open: boolean) {
    this.menuOpen = open;
    this.stopPositioning();
    const root = findDOMNode(this) as HTMLElement;
    this.restoreOpeningScroll = open && root && this.needsMenuOverlay(root) ? preserveOpeningScroll(root) : undefined;
    // Keep lazy menu contents mounted, but close when their trigger scrolls away.
    this.setState({ customDropdownOpen: this.state.customDropdownOpen || open, dropdownOpen: open },
      () => { if (open) this.startPositioning(); });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.id !== this.props.id || prevProps.menuTemplate !== this.props.menuTemplate) {
      // a reused instance now stands for another resource or menu: the
      // rendered menu belongs to the previous one
      this.rendering = false;
      this.setState({ menu: undefined, menuContext: undefined });
      return;
    }
    if (this.props.menuTemplate && this.state.customDropdownOpen && !this.state.menu && !this.rendering) {
      this.renderMenuTemplate();
    }
    if (this.menuOpen) this.schedulePosition();
  }

  componentWillUnmount() {
    this.menuOpen = false;
    this.stopPositioning();
  }

  private startPositioning = () => {
    if (!this.menuOpen) return;
    if (this.restoreOpeningScroll) this.restoreOpeningScroll();
    this.restoreOpeningScroll = undefined;
    const root = findDOMNode(this) as HTMLElement;
    const menu = root && root.querySelector<HTMLElement>('.resource-actions__dropdown-menu');
    if (!root || (menu && menu.classList.contains('resource-card__dropdown-km'))) return;
    if (this.needsMenuOverlay(root)) {
      this.overlay = new DropdownOverlay(root, () => this.onToggle(false),
        { align: 'end', gap: 4, maxHeight: 'viewport' }, '.resource-actions__dropdown-menu');
      this.overlay.position();
      return;
    }
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
    if (this.overlay) this.overlay.dispose();
    this.overlay = undefined;
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
    if (this.overlay) {
      this.overlay.position();
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
    // All ordinary resource menus share toggle-based placement, including
    // clipboard set/KM entries and cards inside scrollable semantic tables.
    // Actual knowledge-map canvas menus retain their existing handling.
    return !root.closest('.reactodia-workspace .reactodia-canvas, .reactodia-exported-canvas');
  }

  shouldComponentUpdate(nextProps: React.PropsWithChildren<Props>, nextState: State) {
    return (
      nextProps.id !== this.props.id ||
      nextProps.menuTemplate !== this.props.menuTemplate ||
      nextProps.className !== this.props.className ||
      nextProps.toggleClassName !== this.props.toggleClassName ||
      nextProps.children !== this.props.children ||
      nextState.dropdownOpen !== this.state.dropdownOpen ||
      nextState.customDropdownOpen !== this.state.customDropdownOpen ||
      nextState.menu !== this.state.menu
    );
  }

  getChildContext() {
    // components inside a menu rendered from `menuTemplate` see the data
    // context the template was rendered with (row bindings, card options)
    const base = super.getChildContext();
    return this.state.menuContext ? { ...base, templateDataContext: this.state.menuContext } : base;
  }

  private rendering = false;

  /**
   * Compile and parse the menu template once, on the first open. The result
   * is the <bs-dropdown-menu> element itself, so react-bootstrap still finds
   * its menu child by role.
   */
  private renderMenuTemplate() {
    this.rendering = true;
    const context = this.context as TemplateContext;
    const capturer = CapturedContext.inheritAndCapture(context.templateDataContext);
    this.appliedTemplateScope
      .compile(this.props.menuTemplate)
      .then(template => template({}, { capturer, parentContext: context.templateDataContext }))
      .then(html => ModuleRegistry.parseHtmlToReact(html))
      .then(menu => {
        this.rendering = false;
        this.setState({ menu, menuContext: capturer.getResult() }, () => this.schedulePosition());
      })
      .catch(error => {
        this.rendering = false;
        console.error('Failed to render resource dropdown menu template', error);
      });
  }

  private renderMenu() {
    if (!this.state.customDropdownOpen) return <Dropdown.Menu />;
    if (this.props.menuTemplate) {
      return this.state.menu || <Dropdown.Menu />;
    }
    return this.props.children;
  }

  render() {
    const { id, className, toggleClassName } = this.props;
    return (
      <Dropdown id={id} className={className} pullRight open={this.state.dropdownOpen} onToggle={this.onToggle}>
        <Dropdown.Toggle className={toggleClassName} aria-label='Resource actions'>
          <Icon iconType='rounded' iconName='more_vert' symbol />
        </Dropdown.Toggle>
        {this.renderMenu()}
      </Dropdown>
    );
  }
}

export default ResourceDropdown;
