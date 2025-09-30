
import * as React from 'react';
import DropdownMenu from 'react-bootstrap/es/DropdownMenu';

export class BsDropdownMenu extends DropdownMenu {
  componentDidMount(): void {
    if(((this as any).props as any).labelledBy === "about-dropdown") {
      if (!window['closeMenu']) {
        window['closeMenu'] = [((this as any).props as any).onClose];
      } else {
        window['closeMenu'].push(((this as any).props as any).onClose);
      }
    }
  }
}

export default BsDropdownMenu;
