/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import * as React from 'react';
import { findDOMNode } from 'react-dom';
import { Dropdown } from 'react-bootstrap';
import { DropdownOverlay, preserveOpeningScroll } from './DropdownOverlay';

export interface AnchoredDropdownProps {
  id: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  pullRight?: boolean;
  /** Preferred menu width, constrained to the available viewport. Default: 280px. */
  menuWidth?: number;
  /** Expand the menu to at least the trigger width. */
  matchTriggerWidth?: boolean;
  /** Maximum height before the menu scrolls. Default: 400px. */
  maxMenuHeight?: number;
}

/** rs-dropdown: accepts bs-dropdown-toggle and bs-dropdown-menu as children. */
export default class AnchoredDropdown extends React.Component<AnchoredDropdownProps, { open: boolean }> {
  state = { open: false };
  private overlay: DropdownOverlay | undefined;

  componentDidUpdate() {
    if (this.overlay) this.overlay.schedulePosition();
  }

  componentWillUnmount() {
    this.stopPositioning();
  }

  private stopPositioning() {
    if (this.overlay) this.overlay.dispose();
    this.overlay = undefined;
  }

  private onToggle = (open: boolean) => {
    this.stopPositioning();
    const root = findDOMNode(this) as HTMLElement;
    const restoreScroll = open ? preserveOpeningScroll(root) : undefined;
    this.setState({ open }, () => {
      if (!open || !this.state.open) return;
      restoreScroll();
      this.overlay = new DropdownOverlay(root, () => this.onToggle(false), {
        width: this.props.menuWidth === undefined ? 280 : this.props.menuWidth,
        matchTriggerWidth: this.props.matchTriggerWidth,
        maxHeight: this.props.maxMenuHeight || 400,
        align: this.props.pullRight ? 'end' : 'start',
      });
      this.overlay.position();
    });
  };

  render() {
    const { id, className, title, disabled, pullRight, children } = this.props;
    return <Dropdown id={id} className={`rs-anchored-dropdown ${className || ''}`} title={title}
      disabled={disabled} pullRight={pullRight} open={this.state.open} onToggle={this.onToggle}>
      {children}
    </Dropdown>;
  }
}
