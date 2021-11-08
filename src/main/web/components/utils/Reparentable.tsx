/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';

// based on https://leoasis.github.io/posts/2017/06/26/reparenting-a-component/
//
// When template is change we want some components to maintain their state,
// e.g Clipboard is good example of such component.
// It works by default with React when components tree stays the same and only
// leaf elements are changing, but as soon as tree structure changes react will
// re-render everything.
// So we use this magical component to prevent re-render even in such situtatios.
//
// see https://github.com/facebook/react/issues/3965 for more info about
// re-render and re-parenting in react

const store: {
  [key: string]: {inUse: boolean; mountNode: HTMLDivElement}
} = {};

function getMountNode(uid: string): HTMLDivElement {
  if (!store[uid]) {
    const mountNode = document.createElement('div');
    mountNode.style.height = '100%';
    store[uid] = {
      mountNode,
      inUse: true
    };
  } else {
    store[uid].inUse = true;
  }
  return store[uid].mountNode;
}

function removeMountNode(uid: string) {
  const record = store[uid];
  record.inUse = false;
  setTimeout(() => {
    if (!store[uid].inUse) {
      ReactDOM.unmountComponentAtNode(store[uid].mountNode);
      delete store[uid];
    }
  }, 5000);
}

interface Props {
  uid: string
}

export class Reparentable extends React.Component<Props> {

  private el: HTMLDivElement;

  componentDidMount() {
    const mountNode = getMountNode(this.props.uid);
    this.el.appendChild(mountNode);
    this.renderChildrenIntoNode(mountNode);
  }

  componentDidUpdate() {
    const mountNode = getMountNode(this.props.uid);
    this.renderChildrenIntoNode(mountNode);
  }

  componentWillUnmount() {
    removeMountNode(this.props.uid);
  }

  renderChildrenIntoNode(node: HTMLDivElement) {
    // We use this instead of `render` because this also handles
    // passing the context
    // for some reason children when used inside dashobard has key that cause
    // re-rendering, so we just drop it with clone.
    const element = React.cloneElement(this.props.children as any, {key: this.props.uid});
    ReactDOM.unstable_renderSubtreeIntoContainer(this, element, node);
  }

  render() {
    return <div style={{flex: '1 1 auto', overflowY: 'auto', height: '100%'}} ref={(el) => { this.el = el; }}></div>;
  }
}
