
import * as React from 'react';
import DropdownMenu from 'react-bootstrap/es/DropdownMenu'

export class BsDropdownMenu extends DropdownMenu {
  componentDidMount(): void {
    if(this.props.labelledBy === "about-dropdown") {
      if (!window['closeMenu']) {
        window['closeMenu'] = [this.props.onClose];
      } else {
        window['closeMenu'].push(this.props.onClose);
      }
    }
  }
}

export default BsDropdownMenu;