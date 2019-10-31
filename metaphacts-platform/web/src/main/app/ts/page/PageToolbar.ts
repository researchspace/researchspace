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

import { createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as CopyToClipboard from 'react-copy-to-clipboard';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { ResourceLink, ResourceLinkAction } from 'platform/api/navigation/components';
import { Rdf } from 'platform/api/rdf';
import * as SecurityService from 'platform/api/services/security';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Cancellation } from 'platform/api/async';
import { Action } from 'platform/components/utils';
import {ResourceViewer} from './ResourceViewer';

import '../../scss/page-editor.scss';

const ButtonGroup = createFactory(ReactBootstrap.ButtonGroup);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);

interface PageEditorToolbarProps {
  iri: Rdf.Iri;
  params?: { [index: string]: string };
}

interface PageEditorToolbarState {
  hasEditPermission: boolean;
  showExploreActions: boolean;
  pageIsResource: boolean;
}

class PageEditorToolbarComponent extends Component<PageEditorToolbarProps, PageEditorToolbarState> {
  private readonly cancellation = new Cancellation();
  private readonly currentIri = Action<Rdf.Iri>();

  constructor(props: PageEditorToolbarProps, context) {
    super(props, context);
    this.state = {
      hasEditPermission: false,
      showExploreActions: false,
      pageIsResource: false,
    };

    this.cancellation.map(
      this.currentIri.$property.flatMap(
        this.canShowExploreActions
      )
    ).onValue(
      state => this.setState(state)
    );
  }

  /**
   * Query that checks if there are any incoming/outgoing properties for the current resource.
   */
  private static isResourceQuery = SparqlUtil.Sparql`
    SELECT * WHERE {
      { ?iri ?p ?o } UNION { ?s ?p ?iri }
    } LIMIT 1
  `;

  public componentDidMount() {
   // Check edit permissions during the first load
      SecurityService.Util.isPermitted(
        SecurityService.Permissions.templateSave + ":<" + this.props.iri.value + ">"
      ).onValue(
        answer => this.setState({ hasEditPermission: answer })
      );
    this.currentIri(this.props.iri);
  }

  public componentWillReceiveProps(props: PageEditorToolbarProps) {
    // Check edit permissions when re-redering the page with a new IRI (e.g, on following a semantic link)
    if (this.props.iri.value !== props.iri.value) {
      SecurityService.Util.isPermitted(
        SecurityService.Permissions.templateSave + ":<" + props.iri.value + ">"
      ).onValue(
        answer => this.setState({ hasEditPermission: answer })
      );
    }
    this.currentIri(props.iri);
  }

  public componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  /**
   * Show explore actions only if user has sufficient permissions and page actually corresponds to
   * some RDF resource.
   */
  private canShowExploreActions = (iri: Rdf.Iri) =>
    this.checkIfPageIsResource(iri).flatMap(
      pageIsResource => {
        const showExploreActionsProp =
          pageIsResource ? this.hasExploreActionsPermissions() : Kefir.constant(false);
        return showExploreActionsProp.map(
          showExploreActions => ({pageIsResource, showExploreActions})
        );
      }
    );

  private hasExploreActionsPermissions = (): Kefir.Property<boolean> =>
    SecurityService.Util.isPermitted(
      SecurityService.Permissions.pageToolbarExplore
    );

  private checkIfPageIsResource = (iri: Rdf.Iri): Kefir.Property<boolean> =>
    SparqlClient.select(
      SparqlClient.setBindings(PageEditorToolbarComponent.isResourceQuery, {iri}),
      {context: this.context.semanticContext}
    ).map(res => !SparqlUtil.isSelectResultEmpty(res))

  public render() {
    return ButtonToolbar(
      {className: 'component-page-toolbar hidden-print'},
      ButtonGroup(
        {},
        this.showAssetsRepositoryIndicator(),
        this.state.hasEditPermission ?
          createElement(ResourceLink, {
            resource: this.props.iri,
            className: 'btn btn-default component-page-toolbar__btn_edit',
            activeClassName: 'active',
            title: 'Edit Page',
            action: ResourceLinkAction.edit,
          }, D.span({}, ' Edit Page')) : null,
        ...(this.state.showExploreActions ? this.renderExploreActions() : [null]),
        this.state.pageIsResource ? this.renderIriCopyAction() : null
      )
    );
  }

  private renderIriCopyAction = () =>
    createElement(
      CopyToClipboard,
      {
        text: this.props.iri.value,
      },
      D.a(
        {
        className: 'btn btn-default component-page-toolbar__btn_copy_iri',
        title: 'Copy IRI',
      }
      )
    );


  private renderExploreActions = () => [
    createElement(
      ResourceViewer,
      {
        pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceStatements',
        title: 'Statements',
        isOpen: this.props.params['showStatements'] === 'true',
        params: {'urlqueryparamShowStatements': 'true'},
      },
      D.a(
        {
        className: 'btn btn-default component-page-toolbar__btn_show_source',
        title: 'Show Statements',
      }
      )
    ),
    createElement(
      ResourceViewer,
      {
        pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceGraph',
        title: 'Graph'
      },
      D.a(
        {
        className: 'btn btn-default component-page-toolbar__btn_show_graph',
        title: 'Show Graph',
      }
      )
    ),
    createElement(
      ResourceViewer,
      {
        pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceDiagram',
        title: 'Diagram'
      },
      D.a(
        {
        className: 'btn btn-default component-page-toolbar__btn_show_diagram',
        title: 'Show Diagram',
      }
      )
    )
  ];

  /**
   * Show assets repository indicator only to users with edit permission.
   */
  private showAssetsRepositoryIndicator() {
    const repository = this.context.semanticContext.repository;
    if (repository === 'assets' && this.state.hasEditPermission) {
      return  D.div(
        {className: 'badge alert-info component-page-toolbar__repository_indicator'},
        'assets repository'
      );
    } else {
      return null;
    }
  }
}

export const PageToolbar = createFactory(PageEditorToolbarComponent);
export default PageToolbar;
