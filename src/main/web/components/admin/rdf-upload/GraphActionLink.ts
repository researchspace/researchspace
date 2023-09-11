/**
 * ResearchSpace
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

import { Props as ReactProps, createElement, createFactory } from 'react';
import * as D from 'react-dom-factories';
import { startsWith, endsWith } from 'lodash';
import * as moment from 'moment';
import * as classnames from 'classnames';
import * as ReactBootstrap from 'react-bootstrap';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { refresh } from 'platform/api/navigation';
import { SparqlUtil } from 'platform/api/sparql';
import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';
import { addNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { getOverlaySystem, OverlayDialog } from 'platform/components/ui/overlay';
import * as GraphActionEvents from './GraphActionEvents';
import { trigger } from 'platform/api/events';

const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);

import './GraphActionLink.scss';
import { overlayMode } from 'codemirror';

const CLASS = 'mp-rdf-graph-action';

export interface Props extends ReactProps<GraphActionLink> {
  graphuri: string;
  action: string;
  fileEnding?: string;
  className?: string;
  graphDescription?: string;
  eventOverlayId?: string;
  turtleString?: string;
}

export interface State {
  isInProcess?: boolean;
}

export class GraphActionLink extends Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { isInProcess: false };
  }

  render() {
    return D.span(
      {
        className: classnames(this.props.className, CLASS),
        onClick: this.onClick,
      },
      this.state.isInProcess
        ? D.div(
            { className: `${CLASS}__spinner-wrap` },
            createElement(Spinner, { spinnerDelay: 0, className: `${CLASS}__spinner` }),
            D.span({ className: `${CLASS}__hide` }, this.props.children)
          )
        : this.props.children
    );
  }

  onClick = () => {
    if (this.state.isInProcess) {
      return;
    }

    if (this.props.action === 'DELETE') {
      const dialogRef = 'confirm-graph-deleting';
      const onHide = () => getOverlaySystem().hide(dialogRef);
      const onSubmit = () => {
        onHide();
        this.deleteGraph();
      };
      getOverlaySystem().show(
        dialogRef,
        createElement(OverlayDialog, {
          show: true,
          title: 'Delete graph',
          bsSize: 'lg',
          onHide,
          children: D.div(
            { style: { textAlign: 'left' } },
            D.p({}, `Are you sure that you want to delete the named graph "${this.props.graphuri}"?`),
            D.p(
              {},
              `Please note that for larger named graphs (> 1 million statements), the deletion may typically take a few seconds (or even minutes) to be finally processed by the database.`
            ),
            ButtonToolbar(
              { style: { display: 'flex', paddingTop: '10px', justifyContent: 'end' } },
              Button({ bsStyle: 'default', onClick: onHide }, 'Cancel'),
              Button({ bsStyle: 'action', onClick: onSubmit }, 'Delete')
            )
          ),
        })
      );
    } else if (this.props.action === 'DELETE CUSTOM') {   
        if (!this.props.eventOverlayId) {
          /* When there is no id set for the modal dialog, skip creating a modal window and run the delete */
          this.deleteGraphWithoutRefresh();
          console.log("delete without refresh");
        } else {
            const dialogRef = this.props.eventOverlayId;
            const onHide = () => getOverlaySystem().hide(dialogRef);
            const onSubmit = () => {
              onHide();
              this.deleteGraphWithoutRefresh();
            };
            
            getOverlaySystem().show(
              dialogRef,
              createElement(OverlayDialog, {
                id: this.props.eventOverlayId,
                show: true,
                title: `Delete ${this.props.graphDescription}`,
                bsSize: 'lg',
                onHide,
                children: D.div(
                  { style: { textAlign: 'left' } },
                  D.p({}, `Are you sure that you want to delete "${this.props.graphDescription}"?`),
                  D.p(
                    {},
                    `Please note that the deletion may typically take a few seconds (or even minutes) to be finally processed.`
                  ),
                  ButtonToolbar(
                    { style: { display: 'flex', paddingTop: '10px', justifyContent: 'end' } },
                    Button({ bsStyle: 'default', onClick: onHide }, 'Cancel'),
                    Button({ bsStyle: 'action', onClick: onSubmit }, 'Delete')
                  )
                ),
              })
            );
        }
    } else if (this.props.action === 'GET') {
      const { repository } = this.context.semanticContext;
      const acceptHeader = SparqlUtil.getMimeType(this.props.fileEnding);
      const ending =
        this.props.fileEnding && endsWith(this.props.graphuri, this.props.fileEnding) ? '' : this.props.fileEnding;
      const fileName = startsWith(this.props.graphuri, 'file:///')
        ? this.props.graphuri.replace('file:///', '') + ending
        : 'graph-export-' + moment().format('YYYY-MM-DDTHH-mm-ss') + '.' + ending;
      RDFGraphStoreService.downloadGraph({
        targetGraph: Rdf.iri(this.props.graphuri),
        acceptHeader,
        fileName,
        repository,
      }).onValue((v) => {});
    } else if (this.props.action === 'UPDATE') { 
        this.updateGraph();
    }
  };

  private updateGraph() {
    this.setState({ isInProcess: false });
    const { repository } = this.context.semanticContext;
    const turtleString = this.props.turtleString?this.props.turtleString:"";

    RDFGraphStoreService.updateGraphRequest({
      targetGraph: Rdf.iri(this.props.graphuri),
      turtleString: turtleString,
      repository,
    }).onValue((_) => {
      // FIRE EVENT
      trigger({
        eventType: GraphActionEvents.GraphActionSuccess,
        source: Math.random().toString()
      }); })
    .onError((error: string) => {
      this.setState({ isInProcess: false });
      addNotification({
        level: 'error',
        message: error,
      });
    });
  }

  private deleteGraphWithoutRefresh() {
    this.setState({ isInProcess: false });
    const { repository } = this.context.semanticContext;

    RDFGraphStoreService.deleteGraph({ targetGraph: Rdf.iri(this.props.graphuri), repository })
      .onValue((_) => {
        // FIRE EVENT
        trigger({
          eventType: GraphActionEvents.GraphActionSuccess,
          source: Math.random().toString()
        }); })
      .onError((error: string) => {
        this.setState({ isInProcess: false });
        addNotification({
          level: 'error',
          message: error,
        });
      });
  }

  private deleteGraph() {
    this.setState({ isInProcess: true });
    addNotification({
      level: 'info',
      message: 'The delete command has been executed and is currently being processed by the database',
    });

    const { repository } = this.context.semanticContext;
    RDFGraphStoreService.deleteGraph({ targetGraph: Rdf.iri(this.props.graphuri), repository })
      .onValue((_) => refresh())
      .onError((error: string) => {
        this.setState({ isInProcess: false });
        addNotification({
          level: 'error',
          message: error,
        });
      });
  }
}

export default GraphActionLink;
