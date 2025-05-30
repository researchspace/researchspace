/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { MetadataApi } from '../data/metadataApi';

import { Element as DiagramElement, ElementEvents, Element } from '../diagram/elements';
import { Vector, boundsOf } from '../diagram/geometry';
import { PaperWidgetProps } from '../diagram/paperArea';

import { EditorController } from '../editor/editorController';
import { AuthoringState } from '../editor/authoringState';

import { AnyListener, EventObserver } from '../viewUtils/events';
import { Cancellation, CancellationToken, Debouncer } from '../viewUtils/async';
import { HtmlSpinner } from '../viewUtils/spinner';

export interface Props extends PaperWidgetProps {
  target: DiagramElement | undefined;
  editor: EditorController;
  metadataApi?: MetadataApi;
  onRemove?: () => void;
  onExpand?: () => void;
  navigationMenuOpened?: boolean;
  onToggleNavigationMenu?: () => void;
  onAddToFilter?: () => void;
  onEstablishNewLink?: (point: Vector) => void;
  onFollowLink?: (element: Element, event: React.MouseEvent<any>) => void;
}

export interface State {
  canLink?: boolean;
}

const CLASS_NAME = 'ontodia-halo';

export class Halo extends React.Component<Props, State> {
  private readonly listener = new EventObserver();
  private targetListener = new EventObserver();
  private queryDebouncer = new Debouncer();
  private queryCancellation = new Cancellation();

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const { editor, target } = this.props;
    this.listener.listen(editor.events, 'changeAuthoringState', () => {
      this.queryAllowedActions();
    });
    this.listenToElement(target);
    this.queryAllowedActions();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.target !== this.props.target) {
      this.listenToElement(this.props.target);
      this.queryAllowedActions();
    }
  }

  componentWillUnmount() {
    this.listener.stopListening();
    this.listenToElement(undefined);
    this.queryDebouncer.dispose();
    this.queryCancellation.abort();
  }

  listenToElement(element: DiagramElement | undefined) {
    this.targetListener.stopListening();
    if (element) {
      this.targetListener.listenAny(element.events, this.onElementEvent);
    }
  }

  private queryAllowedActions() {
    this.queryDebouncer.call(() => {
      this.queryCancellation.abort();
      this.queryCancellation = new Cancellation();
      this.canLink(this.props.target);
    });
  }

  private canLink(target: DiagramElement) {
    const { metadataApi, editor } = this.props;
    if (!metadataApi) {
      this.setState({ canLink: false });
      return;
    }
    const event = editor.authoringState.elements.get(target.iri);
    if (event && event.deleted) {
      this.setState({ canLink: false });
    } else {
      this.setState({ canLink: undefined });
      const signal = this.queryCancellation.signal;
      CancellationToken.mapCancelledToNull(signal, metadataApi.canLinkElement(target.data, signal)).then((canLink) => {
        if (canLink === null) {
          return;
        }
        if (this.props.target.iri === target.iri) {
          this.setState({ canLink });
        }
      });
    }
  }

  private onElementEvent: AnyListener<ElementEvents> = (data) => {
    if (data.changePosition || data.changeSize || data.changeExpanded) {
      this.forceUpdate();
    }
    if (data.changeData) {
      this.queryAllowedActions();
    }
  };

  render() {
    const {
      paperArea,
      editor,
      target,
      navigationMenuOpened,
      onToggleNavigationMenu,
      onAddToFilter,
      onExpand,
      onFollowLink,
    } = this.props;

    if (!target) {
      return <div className={CLASS_NAME} style={{ display: 'none' }} />;
    }

    const bbox = boundsOf(target);
    const { x: x0, y: y0 } = paperArea.paperToScrollablePaneCoords(bbox.x, bbox.y);
    const { x: x1, y: y1 } = paperArea.paperToScrollablePaneCoords(bbox.x + bbox.width, bbox.y + bbox.height);
    const MARGIN = 5;
    const style: React.CSSProperties = {
      left: x0 - MARGIN,
      top: y0 - MARGIN,
      width: x1 - x0 + MARGIN * 2,
      height: y1 - y0 + MARGIN * 2,
    };

    return (
      <div className={CLASS_NAME} style={style}>
        {this.renderRemoveOrDeleteButton()}
        {onToggleNavigationMenu && (
          <div
            className={
              `${CLASS_NAME}__navigate ` + `${CLASS_NAME}__navigate--${navigationMenuOpened ? 'closed' : 'open'}`
            }
            role="button"
            title="Open a dialog to navigate to connected resources"
            onClick={onToggleNavigationMenu}
          />
        )}
        {onFollowLink && (
          <a
            className={`${CLASS_NAME}__folow`}
            href={target.iri}
            role="button"
            title="Jump to resource"
            onClick={(e) => onFollowLink(target, e)}
          />
        )}
        {onAddToFilter && (
          <div
            className={`${CLASS_NAME}__add-to-filter`}
            role="button"
            title="Search connected resources in right sidebar"
            onClick={onAddToFilter}
          />
        )}
        {onExpand && (
          <div
            className={`${CLASS_NAME}__expand ` + `${CLASS_NAME}__expand--${target.isExpanded ? 'closed' : 'open'}`}
            role="button"
            title={`Expand resource`}
            onClick={onExpand}
          />
        )}
        {editor.inAuthoringMode ? this.renderEstablishNewLinkButton() : null}
      </div>
    );
  }

  private renderRemoveOrDeleteButton() {
    const { editor, target, onRemove } = this.props;
    if (!onRemove) {
      return null;
    }

    const isNewElement = AuthoringState.isNewElement(editor.authoringState, target.iri);
    return (
      <div
        className={isNewElement ? `${CLASS_NAME}__delete` : `${CLASS_NAME}__remove`}
        role="button"
        title={isNewElement ? 'Delete new resource' : 'Remove from the map'}
        onClick={onRemove}
      ></div>
    );
  }

  private renderEstablishNewLinkButton() {
    const { onEstablishNewLink } = this.props;
    const { canLink } = this.state;
    if (!onEstablishNewLink) {
      return null;
    }
    if (canLink === undefined) {
      return (
        <div className={`${CLASS_NAME}__establish-connection-spinner`}>
          <HtmlSpinner width={20} height={20} />
        </div>
      );
    }
    const title = canLink ? 'Click or drag and drop to create a connection' : 'Connection is unavailable for the selected resource';
    return (
      <button
        className={`${CLASS_NAME}__establish-connection`}
        title={title}
        onMouseDown={this.onEstablishNewLink}
        disabled={!canLink}
      />
    );
  }

  private onEstablishNewLink = (e: React.MouseEvent<HTMLElement>) => {
    const point = this.props.paperArea.pageToPaperCoords(e.pageX, e.pageY);
    this.props.onEstablishNewLink(point);
  };
}
