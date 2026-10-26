/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Icon from 'platform/components/ui/icon/Icon';
import { FormMenuOverlay } from '../ui/resource-dropdown/FormMenuOverlay';

interface Props {
  /** Opt-in side rail; narrower panels always use the underline header. */
  vertical?: boolean;
  horizontalBelow?: number;
}
interface TabContext {
  activeKey: string | number;
  onSelect: (key: string | number, event?: React.SyntheticEvent<any>) => void;
  getTabId: (key: string | number) => string;
  getPaneId: (key: string | number) => string;
}
interface State { visible: number[]; vertical: boolean; open: boolean; labelWidth: number; }

/** Bootstrap 0.33 tab context, with measured overflow instead of a scroll strip. */
export default class ResponsiveAssetNavigation extends React.Component<Props, State> {
  static defaultProps: Props = { vertical: false, horizontalBelow: 800 };
  static contextTypes = { $bs_tabContainer: PropTypes.object };
  context: { $bs_tabContainer?: TabContext };
  state: State = { visible: [], vertical: false, open: false, labelWidth: 0 };
  private root = React.createRef<HTMLDivElement>();
  private measureRoot = React.createRef<HTMLDivElement>();
  private toggle = React.createRef<HTMLButtonElement>();
  private menu = React.createRef<HTMLUListElement>();
  private observer: ResizeObserver | undefined;
  private overlay: FormMenuOverlay | undefined;
  private mounted = false;
  private focusFrame: number | undefined;

  private tabs() {
    return React.Children.toArray(this.props.children).filter(React.isValidElement) as React.ReactElement<any>[];
  }
  componentDidMount() {
    this.mounted = true;
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.measure);
      this.observer.observe(this.root.current);
      const sidebar = this.root.current.closest('.form-assets-sidebar');
      if (sidebar) this.observer.observe(sidebar);
    }
    window.addEventListener('resize', this.measure);
    window.addEventListener('scroll', this.positionMenu, true);
    document.addEventListener('mousedown', this.onOutside);
    document.addEventListener('touchstart', this.onOutside);
    if (document.fonts) document.fonts.ready.then(() => { if (this.mounted) this.measure(); });
    this.measure();
  }
  componentDidUpdate() {
    this.measure();
    if (this.state.open && this.menu.current && !this.overlay) {
      this.overlay = new FormMenuOverlay(this.menu.current);
      this.positionMenu();
    } else if (!this.state.open && this.overlay) {
      this.overlay.dispose(); this.overlay = undefined;
    }
  }
  componentWillUnmount() {
    this.mounted = false;
    if (this.observer) this.observer.disconnect();
    if (this.overlay) this.overlay.dispose();
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
    window.removeEventListener('resize', this.measure);
    window.removeEventListener('scroll', this.positionMenu, true);
    document.removeEventListener('mousedown', this.onOutside);
    document.removeEventListener('touchstart', this.onOutside);
  }
  private measure = () => {
    const root = this.root.current;
    if (!root || !root.clientWidth || !this.measureRoot.current) return;
    const sidebar = root.closest<HTMLElement>('.form-assets-sidebar') || root;
    const vertical = !!this.props.vertical && sidebar.clientWidth > this.props.horizontalBelow;
    const tabs = this.tabs();
    const widths = Array.prototype.map.call(this.measureRoot.current.children,
      (element: HTMLElement) => element.getBoundingClientRect().width) as number[];
    const moreWidth = widths.pop() || 64;
    const width = root.clientWidth;
    const active = Math.max(0, tabs.findIndex(tab => tab.props.eventKey === this.context.$bs_tabContainer.activeKey));
    let visible = tabs.map((_, index) => index);
    const labelWidth = Math.max(0, width - moreWidth);
    if (!vertical && widths.reduce((sum, value) => sum + value, 0) > width) {
      visible = [active];
      let used = Math.min(labelWidth, widths[active] || 0);
      for (let index = 0; index < tabs.length; index++) {
        if (index === active) continue;
        if (used + widths[index] > labelWidth) break;
        visible.push(index); used += widths[index];
      }
      visible.sort((a, b) => a - b);
    }
    if (vertical !== this.state.vertical || labelWidth !== this.state.labelWidth ||
        visible.join(',') !== this.state.visible.join(',')) {
      this.setState({ vertical, visible, labelWidth, open: false });
    } else this.positionMenu();
  };
  private positionMenu = () => {
    if (this.overlay && this.toggle.current && !this.overlay.position(this.toggle.current)) {
      this.setState({ open: false });
    }
  };
  private onOutside = (event: Event) => {
    if (this.state.open && !this.root.current.contains(event.target as Node)) this.setState({ open: false });
  };
  private focusTab(index: number) {
    if (this.focusFrame !== undefined) cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      const button = this.root.current && this.root.current.querySelector<HTMLButtonElement>(`[data-tab-index="${index}"]`);
      if (button) button.focus({ preventScroll: true });
    });
  }
  private select = (index: number, event: React.SyntheticEvent<any>) => {
    event.preventDefault();
    const tab = this.tabs()[index];
    if (!tab || tab.props.disabled) return;
    if (tab.props.onSelect) tab.props.onSelect(tab.props.eventKey, event);
    this.context.$bs_tabContainer.onSelect(tab.props.eventKey, event);
    this.setState({ open: false }, () => { this.measure(); this.focusTab(index); });
  };
  private tabKeyDown = (index: number, event: React.KeyboardEvent<any>) => {
    const tabs = this.tabs();
    const forward = this.state.vertical ? 'ArrowDown' : 'ArrowRight';
    const back = this.state.vertical ? 'ArrowUp' : 'ArrowLeft';
    let next = index;
    if (event.key === 'Home') next = -1;
    else if (event.key === 'End') next = tabs.length;
    else if (event.key !== forward && event.key !== back) return;
    const step = event.key === back || event.key === 'End' ? -1 : 1;
    for (let attempts = 0; attempts < tabs.length; attempts++) {
      next = (next + step + tabs.length) % tabs.length;
      if (!tabs[next].props.disabled) break;
    }
    this.select(next, event);
  };
  private openMenu = () => {
    this.setState({ open: !this.state.open }, () => {
      if (this.state.open && this.menu.current) {
        const first = this.menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)');
        if (first) first.focus({ preventScroll: true });
      }
    });
  };
  private menuKeyDown = (event: React.KeyboardEvent<any>) => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      this.setState({ open: false }, () => this.toggle.current.focus({ preventScroll: true }));
    } else if (event.key === 'Tab') {
      this.toggle.current.focus({ preventScroll: true });
      this.setState({ open: false });
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(event.key) >= 0) {
      event.preventDefault();
      const buttons = Array.prototype.slice.call(this.menu.current.querySelectorAll('button:not(:disabled)')) as HTMLButtonElement[];
      let index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      if (buttons[index]) {
        buttons[index].focus({ preventScroll: true });
        const item = buttons[index], menu = this.menu.current;
        if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
        else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight) {
          menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
        }
      }
    }
  };
  render() {
    const context = this.context.$bs_tabContainer;
    if (!context) return null;
    const tabs = this.tabs();
    const { visible, vertical, open, labelWidth } = this.state;
    const overflow = !vertical && visible.length < tabs.length;
    const menuId = context.getTabId('media-overflow-menu');
    return (
      <div className='form-asset-navigation' ref={this.root} data-orientation={vertical ? 'vertical' : 'horizontal'}>
        <div className='form-asset-navigation__measure' aria-hidden='true' ref={this.measureRoot}>
          {tabs.map((tab, index) => <span className='form-asset-navigation__tab' key={index}>{tab.props.children}</span>)}
          <span className='form-asset-navigation__more'>More <Icon iconType='rounded' symbol iconName='expand_more' /></span>
        </div>
        <div className='form-asset-media-nav' role='tablist' aria-label='Media type' aria-orientation={vertical ? 'vertical' : 'horizontal'}>
          {tabs.map((tab, index) => {
            const active = context.activeKey === tab.props.eventKey;
            return <button key={tab.props.eventKey} type='button' role='tab'
              id={context.getTabId(tab.props.eventKey)} aria-controls={context.getPaneId(tab.props.eventKey)}
              aria-selected={active} tabIndex={active ? 0 : -1} disabled={tab.props.disabled}
              hidden={visible.indexOf(index) < 0} data-tab-index={index}
              className='form-asset-navigation__tab' style={overflow ? { maxWidth: labelWidth } : undefined}
              title={typeof tab.props.children === 'string' ? tab.props.children : undefined}
              onClick={event => this.select(index, event)} onKeyDown={event => this.tabKeyDown(index, event)}>
              <span>{tab.props.children}</span>
            </button>;
          })}
        </div>
        <button type='button' ref={this.toggle} hidden={!overflow} className='form-asset-navigation__more'
          aria-expanded={open} aria-haspopup='menu' aria-controls={menuId}
          onClick={this.openMenu} onKeyDown={event => {
            if (event.key === 'ArrowDown' && !open) { event.preventDefault(); this.openMenu(); }
          }}>
          More <Icon iconType='rounded' symbol iconName='expand_more' />
        </button>
        <ul ref={this.menu} id={menuId} role='menu' aria-label='More media types'
          className='form-asset-navigation__menu' hidden={!open} onKeyDown={this.menuKeyDown}>
          {tabs.map((tab, index) => visible.indexOf(index) >= 0 ? null : (
            <li key={tab.props.eventKey} role='none'><button type='button' role='menuitem'
              disabled={tab.props.disabled} onClick={event => this.select(index, event)}>{tab.props.children}</button></li>
          ))}
        </ul>
      </div>
    );
  }
}
